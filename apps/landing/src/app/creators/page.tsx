import Image from "next/image";
import type { Metadata } from "next";
import s from "./creators.module.css";

/**
 * /creators — the creator program pitch page. Founder's copy, structured by
 * what converts (perks first, ₹ mental math, one-line job, first-ten
 * scarcity, FAQ) and designed with the offline-artifact language: polaroids,
 * tape, ticket stubs, sticky notes, a stamped seal. Real event photos only —
 * no stock, no invented testimonials. Fully static; CTA → WhatsApp →
 * acquisition pipeline.
 */

const WA_LINK = `https://wa.me/919380906810?text=${encodeURIComponent(
  "hey! i want in on the creator program — tell me more?"
)}`;

export const metadata: Metadata = {
  title: "get paid to go out — come offline creators",
  description:
    "turn the plans you're already making into income. bring your people to real rooms in bangalore, get paid for every seat you fill. applications open for the first ten creators.",
  openGraph: {
    title: "get paid to go out.",
    description:
      "bangalore's first ten creators — every person who joins because of you earns you money. come offline's creator program.",
    url: "https://www.comeoffline.com/creators",
    siteName: "come offline.",
    type: "website",
    images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: "come offline creator program" }],
  },
  alternates: { canonical: "https://www.comeoffline.com/creators" },
};

const FAQS = [
  {
    q: "do i have to attend the events?",
    a: <>yes. you only promote rooms you&rsquo;ll actually be in. that&rsquo;s the whole point — and why your audience trusts you.</>,
  },
  {
    q: "when do i get paid?",
    a: <>monthly, straight to your upi. no invoices, no net-90, no &ldquo;after the campaign report.&rdquo;</>,
  },
  {
    q: "is there a minimum before i earn?",
    a: (
      <>
        your earnings unlock after your first <strong>10 lifetime tickets</strong>. cross that and you get paid for{" "}
        <strong>all</strong> of them — including the very first one.
      </>
    ),
  },
  {
    q: "what if people click but don't buy?",
    a: (
      <>
        you still earn. <strong>every 100 clicks on your link pays</strong> — before anyone books a ticket. seats are
        the big money; clicks are the floor under it.
      </>
    ),
  },
  {
    q: "what if someone buys days after clicking?",
    a: (
      <>
        still yours. <strong>your link remembers whoever clicked it for 30 days</strong>, and your code never expires —
        typed at checkout anytime, the sale counts for you.
      </>
    ),
  },
  {
    q: "can i choose which events i promote?",
    a: <>yes. enrol only for the ones you&rsquo;re genuinely excited about. no quotas, no forced calendars.</>,
  },
  {
    q: "do i get free access?",
    a: <>yes. if you&rsquo;re promoting it, you&rsquo;re invited. you never pay to enter a room you&rsquo;re filling.</>,
  },
  {
    q: "do i need a huge audience?",
    a: (
      <>
        no. smaller, engaged communities regularly out-fill much bigger accounts.{" "}
        <strong>we count rooms filled, not followers.</strong>
      </>
    ),
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className={s.sectionLabel}>
      <span className={s.sectionStar} aria-hidden="true">
        ✳
      </span>
      {children}
      <span className={s.sectionRule} aria-hidden="true" />
    </h2>
  );
}

export default function CreatorsPage() {
  return (
    <div className={s.page}>
      <div className={s.topnav}>
        <span className={s.brandlock}>
          <Image src="/logo.png" alt="come offline logo" width={34} height={34} className={s.logo} />
          <span className={s.wordmark}>comeoffline</span>
        </span>
      </div>

      <main className={s.wrap}>
        {/* ── hero ── */}
        <header className={s.hero}>
          <p className={s.eyebrow}>for creators who bring people together</p>
          <h1 className={s.headline}>get paid to go out.</h1>
          <p className={s.subhead}>turn the plans you&rsquo;re already making into income.</p>
          <p className={s.heroBody}>
            you&rsquo;re already the friend who says <em>&ldquo;come, i&rsquo;m going.&rdquo;</em>
            <br />
            now every person who joins because of you earns you money.
          </p>
          <a className={s.cta} href={WA_LINK} target="_blank" rel="noopener noreferrer">
            apply on whatsapp →
          </a>
          {/* the three answers people scan for, before they scroll */}
          <div className={s.pills}>
            <span className={s.pill}>✨ free entry to every event you promote</span>
            <span className={s.pill}>💸 ₹150+ per ticket you sell</span>
            <span className={s.pill}>🔗 clicks pay too — even before anyone buys</span>
            <span className={s.pill}>📍 bangalore creators only</span>
          </div>

          {/* proof of life — a real room, not stock */}
          <figure className={s.heroPolaroid}>
            <span className={s.tape} aria-hidden="true" />
            <Image
              src="/creators/party-67.jpg"
              alt="jenga getting serious at the last friends house"
              width={1400}
              height={912}
              className={s.heroShot}
              priority
            />
            <figcaption className={s.polaroidCap}>last friends house. every one of them was invited by someone.</figcaption>
          </figure>
          <p className={s.heroScribble} aria-hidden="true">
            ↑ rooms like this. that&rsquo;s the product.
          </p>
        </header>

        {/* ── manifesto ── */}
        <section className={s.manifesto}>
          <span className={s.tape} aria-hidden="true" />
          <h2 className={s.manifestoTitle}>
            you&rsquo;re not selling events.
            <br />
            you&rsquo;re inviting friends.
          </h2>
          <p className={s.manifestoBody}>
            the people who bring communities together have always existed. we&rsquo;ve simply built a way for them to
            get paid.
          </p>
          <p className={s.manifestoPunch}>
            you bring people.
            <br />
            we pay you for it.
          </p>
        </section>

        {/* ── brand moment — full-width, quiet, memorable ── */}
        <div className={s.why}>
          <p className={s.whyLine}>social media has enough ads.</p>
          <p className={s.whyPunch}>
            we&rsquo;d rather have creators inside the room
            <br />
            than posting about it from outside.
          </p>
        </div>

        {/* ── how it works — each step its own artifact ── */}
        <SectionLabel>how it works</SectionLabel>

        <article className={s.step}>
          <span className={s.paperclip} aria-hidden="true">
            📎
          </span>
          <p className={s.stepNum}>01</p>
          <h3 className={s.stepTitle}>get your invite page</h3>
          <p className={s.stepBody}>
            we build you a personal page — <code>comeoffline.com/with/yourname</code> — your photo, a message in your
            own words, the events you&rsquo;re attending. <strong>you approve every line</strong> before it goes live.
          </p>
        </article>

        <article className={s.step}>
          <p className={s.stepNum}>02</p>
          <h3 className={s.stepTitle}>share your code</h3>
          <p className={s.stepBody}>your followers save money. you earn on every ticket booked with it.</p>
          {/* the code as the coupon it is */}
          <div className={s.coupon}>
            <span className={s.couponCode}>NIKITH</span>
            <span className={s.couponNote}>
              typed three weeks after your story expired? <strong>still counts.</strong>
            </span>
          </div>
        </article>

        <article className={s.step}>
          <p className={s.stepNum}>03</p>
          <h3 className={s.stepTitle}>make content</h3>
          <p className={s.stepBody}>
            join campaigns for events you love. a one-paragraph brief, references, talking points — no scripts, no
            forced selling. just tell your people why you&rsquo;re going.
          </p>
          {/* the brief arrives like everything else in this city — on whatsapp */}
          <div className={s.chatBubble}>
            <p className={s.chatText}>
              brief for saturday: show the real thing — you walking in solo, the games table. talk like you&rsquo;re
              telling a friend. here&rsquo;s a reel we love for reference 🔗
            </p>
            <span className={s.chatMeta}>come offline · 11:42 am</span>
          </div>
          {/* the whole job, on a sticky note */}
          <p className={s.sticky}>
            one reel per event you join.
            <br />
            that&rsquo;s the whole job.
          </p>
        </article>

        {/* step 4 — the payoff card */}
        <article className={`${s.step} ${s.stepPayoff}`}>
          <p className={s.stepNum}>04</p>
          <h3 className={s.stepTitlePayoff}>show up &amp; earn</h3>
          <p className={s.stepBodyPayoff}>
            actually be there. meet your community. every person you bring becomes part of the room —{" "}
            <strong>and every seat pays you.</strong>
          </p>
          <p className={s.payoffStamp} aria-hidden="true">
            the fun part ✶
          </p>
        </article>

        {/* ── full-bleed photo band — breathing room with humans in it ── */}
        <figure className={s.photoBand}>
          <Image
            src="/creators/party-64.jpg"
            alt="the room at friends house — warm lamps, the games table, everyone standing around it"
            width={1400}
            height={912}
            className={s.photoBandImg}
          />
          <figcaption className={s.photoBandCap}>saturday, mid-game. your audience has never been here. yet.</figcaption>
        </figure>

        {/* ── money — a ticket stub, because it pays per ticket ── */}
        <SectionLabel>what you&rsquo;ll earn</SectionLabel>
        <div className={s.ticket}>
          <div className={s.ticketMain}>
            <div className={s.moneyBig}>₹150+</div>
            <div className={s.moneyBigLabel}>per ticket sold</div>
            <div className={s.calc}>
              <div className={s.calcRow}>
                <span>bring 10 friends</span>
                <span className={s.calcAmount}>≈ ₹1,500</span>
              </div>
              <div className={s.calcRow}>
                <span>fill 50 seats this month</span>
                <span className={s.calcAmount}>≈ ₹7,500</span>
              </div>
              <div className={s.calcRow}>
                <span>on a ₹250 campaign event</span>
                <span className={s.calcAmount}>≈ ₹12,500</span>
              </div>
              <div className={s.calcRow}>
                <span>2,000 clicks on that reel — before a single sale</span>
                <span className={s.calcAmount}>≈ ₹2,000</span>
              </div>
            </div>
            <p className={s.moneyBigNote}>examples, not promises. you see the exact rate before you post.</p>
          </div>
          <div className={s.ticketStub}>
            <span className={s.ticketStubText}>admit everyone · pay one</span>
          </div>
        </div>

        <div className={s.moneyGrid}>
          <div className={s.moneyCard}>
            <span className={s.moneyEmoji}>🚀</span>
            <h3 className={s.moneyTitle}>campaign boosts</h3>
            <p className={s.moneyDesc}>select events pay up to ₹250 a seat — every sale, boosted.</p>
          </div>
          <div className={s.moneyCard}>
            <span className={s.moneyEmoji}>🔗</span>
            <h3 className={s.moneyTitle}>click rewards</h3>
            <p className={s.moneyDesc}>earn for every 100 clicks on your invite link.</p>
          </div>
          <div className={s.moneyCard}>
            <span className={s.moneyEmoji}>🎟️</span>
            <h3 className={s.moneyTitle}>free entry</h3>
            <p className={s.moneyDesc}>promoting it means you&rsquo;re invited. always.</p>
          </div>
        </div>

        {/* ── dashboard — the product, mocked crisp in html ── */}
        <SectionLabel>your creator dashboard</SectionLabel>
        <div className={s.dashMock} aria-label="a preview of the creator studio">
          <span className={s.tape} aria-hidden="true" />
          <div className={s.dashMockHead}>
            <span className={s.dashMockTitle}>creator studio</span>
            <span className={s.dashMockLive}>● live</span>
          </div>
          <div className={s.dashMockTiles}>
            <div className={s.dashMockTile}>
              <span className={s.dashMockLabel}>this month</span>
              <span className={s.dashMockValue}>12 seats</span>
            </div>
            <div className={s.dashMockTile}>
              <span className={s.dashMockLabel}>link clicks</span>
              <span className={s.dashMockValue}>1,847</span>
            </div>
            <div className={s.dashMockTile}>
              <span className={s.dashMockLabel}>earned</span>
              <span className={s.dashMockValue}>₹7,050</span>
            </div>
            <div className={s.dashMockTile}>
              <span className={s.dashMockLabel}>owed to you</span>
              <span className={`${s.dashMockValue} ${s.dashMockAccent}`}>₹2,400</span>
            </div>
          </div>
          <div className={s.dashMockRow}>
            <span>friends house · 2 seats · via your code</span>
            <span className={s.dashMockAccent}>+₹400</span>
          </div>
          <div className={s.dashMockRow}>
            <span>supper club · 1 seat · via your link</span>
            <span className={s.dashMockAccent}>+₹150</span>
          </div>
        </div>
        <p className={s.dashNote}>watch the rupees tick up mid-party. live, in the app.</p>

        {/* ── the ladder — soft wording by design, mechanics locked later ── */}
        <SectionLabel>the ladder</SectionLabel>
        <div className={s.ladder}>
          <div className={s.rung}>
            <span className={s.rungLevel}>level one · 10 seats</span>
            <p className={s.rungText}>
              payouts unlock. <strong>every seat from your first one pays.</strong>
            </p>
          </div>
          <div className={s.rung}>
            <span className={s.rungLevel}>level two · 50 seats</span>
            <p className={s.rungText}>closer to the house — first look at new campaigns, a louder say in what we run.</p>
          </div>
          <div className={`${s.rung} ${s.rungTop}`}>
            <span className={s.rungLevel}>level three · 150 seats</span>
            <p className={s.rungText}>
              founding creator. <strong>the perks up here are being saved for whoever arrives first.</strong>
            </p>
          </div>
        </div>
        <p className={s.ladderNote}>nobody&rsquo;s reached the top yet. the first ten start climbing together.</p>

        {/* ── who ── */}
        <SectionLabel>who we&rsquo;re looking for</SectionLabel>
        <p className={s.whoLede}>
          the best creators aren&rsquo;t always the biggest.
          <br />
          <em>sometimes they&rsquo;re simply the person everyone messages first.</em>
        </p>
        <div className={s.chips}>
          {["lifestyle", "food", "fitness", "photographer", "musician", "stand-up", "student creator", "community builder"].map(
            (chip) => (
              <span key={chip} className={s.chip}>
                {chip}
              </span>
            )
          )}
          <span className={`${s.chip} ${s.chipStar}`}>the person everyone texts before making weekend plans</span>
        </div>
        <p className={s.whoNote}>
          you don&rsquo;t need 100k followers. you don&rsquo;t even need 10k. if people trust your recommendations,{" "}
          <strong>you&rsquo;re exactly who we&rsquo;re looking for.</strong>
        </p>

        {/* ── why we built this — the postcard ── */}
        <SectionLabel>why we built this</SectionLabel>
        <div className={s.built}>
          <span className={s.tape} aria-hidden="true" />
          <p className={s.builtBody}>
            most affiliate programs pay people to sell. we&rsquo;d rather reward people for bringing communities
            together.
          </p>
          <p className={s.builtBody}>come offline exists because the best nights happen when someone says —</p>
          <p className={s.builtQuote}>&ldquo;come with me.&rdquo;</p>
          <p className={s.builtSign}>— come offline, bangalore</p>
        </div>

        {/* ── faq ── */}
        <SectionLabel>questions you&rsquo;re probably asking</SectionLabel>
        <p className={s.faqAside}>(the ones we actually get on whatsapp)</p>
        {FAQS.map((faq) => (
          <details key={faq.q} className={s.faq}>
            <summary>{faq.q}</summary>
            <p className={s.faqBody}>{faq.a}</p>
          </details>
        ))}

        {/* ── first ten ── */}
        <SectionLabel>bangalore&rsquo;s first ten</SectionLabel>
        <div className={s.ten}>
          <div className={s.tenSeal} aria-hidden="true">
            <svg viewBox="0 0 100 100">
              <defs>
                <path id="tenPath" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
              </defs>
              <text className={s.tenSealText}>
                <textPath href="#tenPath">first ten ✳ first ten ✳ first ten ✳ </textPath>
              </text>
            </svg>
            <span className={s.tenSealMark}>✶</span>
          </div>
          <h3 className={s.tenTitle}>we&rsquo;re keeping the first cohort small.</h3>
          <p className={s.tenBody}>
            ten creators. we&rsquo;ll build your page with you, tune campaigns together, and grow this thing from inside
            the room.
          </p>
          <p className={s.tenPunch}>if you&rsquo;re someone people listen to when making plans — that&rsquo;s you.</p>
        </div>

        {/* ── close — an ending, not a footer ── */}
        <section className={s.close}>
          <Image
            src="/creators/party-73.jpg"
            alt=""
            width={1400}
            height={912}
            className={s.closeBg}
            aria-hidden="true"
          />
          <div className={s.closeInner}>
            <p className={s.closeLede}>
              get paid to bring
              <br />
              people together.
            </p>
            <p className={s.closeLine}>you were going out anyway.</p>
            <a className={s.closeCta} href={WA_LINK} target="_blank" rel="noopener noreferrer">
              apply on whatsapp →
            </a>
            <p className={s.closeNote}>a real human replies. usually fast.</p>
            <p className={s.legal}>
              creators must clearly disclose their partnership with come offline wherever applicable, in accordance
              with asci guidelines. commissions apply only to eligible completed ticket purchases — refunds,
              cancellations and personal purchases are excluded from earnings. earnings examples are illustrative, not
              guarantees.
            </p>
            <div className={s.foot}>
              <Image src="/logo.png" alt="come offline logo" width={48} height={48} className={s.footLogo} />
              <p className={s.footBrand}>comeoffline</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
