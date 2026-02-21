import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.googleAiApiKey);

interface GeneratedSpotSeat {
  label: string;
  angle: number;
}

interface GeneratedSpot {
  name: string;
  emoji: string;
  capacity: number;
  description: string;
  x: number;
  y: number;
  shape: "circle" | "rectangle" | "square";
  spot_type: "table" | "fixture" | "zone";
  seats?: GeneratedSpotSeat[];
}

/**
 * Analyze a floor plan image with Gemini Vision and generate seating spots.
 */
export async function analyzeFloorPlan(
  imageBase64: string,
  mimeType: string,
): Promise<GeneratedSpot[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
    {
      text: `You are analyzing a floor plan or venue layout image for an experiential events company. Identify ALL elements in the image — tables, fixtures, landmarks, and zones.

ELEMENT TYPES — classify each element:
- "table" = any bookable seating: tables with chairs, bean bags, hammocks, couches, bar stools. These have capacity > 0 and optional individual seats.
- "fixture" = non-bookable landmarks: DJ booth, DJ console, bar counter, stage, sound system, reception desk, photo booth. These are visual landmarks only (capacity 0, no seats).
- "zone" = non-bookable open areas: villa entrance, garden area, dance floor, lounge area, hallway, entrance. These are labeled areas (capacity 0, no seats).

Rules:
- If you see a TABLE with CHAIRS around it, create ONE spot of type "table" with capacity = number of chairs
- If you see standalone seating (bean bags, hammocks, armchairs), each is type "table" with capacity 1
- DJ booths, consoles, bars, stages → type "fixture" with capacity 0
- Open areas, entrances, gardens, villas → type "zone" with capacity 0
- Label similar items sequentially: "Table 1", "Table 2", "Table 3" etc.
- Give unique descriptive names to distinctive spots: "Window Nook", "DJ Console", "Villa Entrance"
- Be generous with emoji — each type should have a fitting emoji

For each element, provide:
- name: Short descriptive name
- emoji: Single emoji representing this element
- capacity: Number of people (0 for fixtures and zones)
- description: One-line description
- x: CENTER horizontal position as percentage of image width (0=left, 100=right). Be precise.
- y: CENTER vertical position as percentage of image height (0=top, 100=bottom). Be precise.
- shape: "circle" for round tables, "rectangle" for long tables, "square" for square tables. For fixtures/zones use "circle".
- spot_type: "table", "fixture", or "zone"
- seats: ONLY for "table" type with chairs — array of individual seats:
  - label: "Seat 1", "Seat 2", etc.
  - angle: Degrees around table center (0=top, 90=right, 180=bottom, 270=left). Distribute evenly.
  Omit seats for fixtures, zones, and single-seat spots (capacity 1).

IMPORTANT for x and y: Carefully look at the spatial arrangement. Items on the left = lower x. Items at the top = lower y. Same-row items = similar y values. Be as accurate as possible.

Return ONLY a valid JSON array, no markdown code fences, no other text. Example:
[{"name":"Table 1","emoji":"🍽️","capacity":4,"description":"Round table near entrance","x":25,"y":30,"shape":"circle","spot_type":"table","seats":[{"label":"Seat 1","angle":0},{"label":"Seat 2","angle":90},{"label":"Seat 3","angle":180},{"label":"Seat 4","angle":270}]},{"name":"DJ Console","emoji":"🎧","capacity":0,"description":"Main DJ setup","x":50,"y":10,"shape":"rectangle","spot_type":"fixture"},{"name":"Villa Entrance","emoji":"🏛️","capacity":0,"description":"Main entrance area","x":50,"y":95,"shape":"circle","spot_type":"zone"}]

Return between 3 and 40 elements. If the image is unclear, make reasonable guesses based on what you can see.`,
    },
  ]);

  const text = result.response.text();

  // Extract JSON array from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response into spots");
  }

  const spots: GeneratedSpot[] = JSON.parse(jsonMatch[0]);

  // Validate and sanitize
  return spots
    .filter((s) => s.name)
    .map((s) => {
      const spotType = (["table", "fixture", "zone"].includes(s.spot_type) ? s.spot_type : "table") as "table" | "fixture" | "zone";
      const isBookable = spotType === "table";
      return {
        name: s.name.trim(),
        emoji: s.emoji || "🪑",
        capacity: isBookable ? Math.max(1, Math.round(s.capacity || 1)) : 0,
        description: (s.description || "").trim(),
        x: Math.max(0, Math.min(100, Math.round(s.x ?? 50))),
        y: Math.max(0, Math.min(100, Math.round(s.y ?? 50))),
        shape: (["circle", "rectangle", "square"].includes(s.shape) ? s.shape : "circle") as "circle" | "rectangle" | "square",
        spot_type: spotType,
        seats: isBookable ? s.seats?.map((seat) => ({
          label: seat.label || "Seat",
          angle: Math.max(0, Math.min(360, Math.round(seat.angle ?? 0))),
        })) : undefined,
      };
    });
}
