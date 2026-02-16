import { getDb } from "../config/firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

/** Send push notification to a single user */
export async function sendToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const messaging = getMessaging();
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return { success: false, error: "User not found" };

  const fcmToken = userDoc.data()!.fcm_token;
  if (!fcmToken) return { success: false, error: "User has no FCM token" };

  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: data || {},
      webpush: {
        notification: {
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          vibrate: [100, 50, 100],
        },
      },
    });
    return { success: true };
  } catch (err) {
    console.error(`[notifications] Failed to send to ${userId}:`, err);
    return { success: false, error: "Failed to send notification" };
  }
}

/** Send push notification to an audience */
export async function sendToAudience(
  audience: "all" | "active" | "provisional" | string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; sent: number; failed: number }> {
  const db = await getDb();
  const messaging = getMessaging();
  let query: FirebaseFirestore.Query = db.collection("users");

  if (audience === "active") {
    query = query.where("status", "==", "active");
  } else if (audience === "provisional") {
    query = query.where("status", "==", "provisional");
  } else if (audience !== "all") {
    // Treat as event_id — send to users with confirmed tickets for this event
    const ticketSnap = await db
      .collection("tickets")
      .where("event_id", "==", audience)
      .where("status", "in", ["confirmed", "checked_in"])
      .get();

    const userIds = [...new Set(ticketSnap.docs.map((d) => d.data().user_id))];

    // OPTIMIZATION: Batch query users instead of one-by-one
    // Firestore 'in' query supports up to 30 items, so we batch in chunks
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < userIds.length; i += 30) {
      const batchIds = userIds.slice(i, i + 30);
      const usersSnap = await db
        .collection("users")
        .where("__name__", "in", batchIds)
        .select("fcm_token")
        .get();

      // Send notifications for this batch
      for (const userDoc of usersSnap.docs) {
        const fcmToken = userDoc.data().fcm_token;
        if (!fcmToken) {
          failed++;
          continue;
        }

        try {
          await messaging.send({
            token: fcmToken,
            notification: { title, body },
            data: data || {},
            webpush: {
              notification: {
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                vibrate: [100, 50, 100],
              },
            },
          });
          sent++;
        } catch (err) {
          console.error(`[notifications] Failed to send to ${userDoc.id}:`, err);
          failed++;
        }
      }
    }

    return { success: true, sent, failed };
  }

  const usersSnap = await query.select("fcm_token").get();
  let sent = 0;
  let failed = 0;

  // Collect tokens and send in batches
  const messages: Array<{ token: string }> = [];
  for (const doc of usersSnap.docs) {
    const fcmToken = doc.data().fcm_token;
    if (fcmToken) messages.push({ token: fcmToken });
  }

  // Send individually (FCM multicast has limits)
  for (const msg of messages) {
    try {
      await messaging.send({
        token: msg.token,
        notification: { title, body },
        data: data || {},
        webpush: {
          notification: {
            icon: "/icon-192.png",
            badge: "/icon-192.png",
          },
        },
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { success: true, sent, failed };
}

/** Store a notification record (for history) */
export async function createNotificationRecord(
  title: string,
  body: string,
  audience: string,
  sentBy: string,
  sent: number,
  failed: number,
) {
  const db = await getDb();
  await db.collection("notifications").add({
    title,
    body,
    audience,
    sent_by: sentBy,
    sent_count: sent,
    failed_count: failed,
    sent_at: new Date().toISOString(),
  });
}

/** Get notification history */
export async function getNotificationHistory() {
  const db = await getDb();
  const snap = await db
    .collection("notifications")
    .orderBy("sent_at", "desc")
    .limit(50)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
