import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ScrollText } from 'lucide-react';

const SITE_URL = 'https://roboheard.ai';
const LAST_UPDATED = 'June 9, 2026';

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 mb-10">
    <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-3">{title}</h2>
    <div className="space-y-3 text-muted-foreground leading-relaxed text-[15px]">{children}</div>
  </section>
);

const Terms: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms & Conditions — RoboHeard';
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'The official (and lightly quirky) RoboHeard Terms & Conditions — what you agree to when chatting with eight frontier AI models.');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', `${SITE_URL}/terms`);
  }, []);

  const toc = [
    ['the-deal', '1. The Deal'],
    ['who-can-use', '2. Who Can Use This'],
    ['your-account', '3. Your Account'],
    ['tokens', '4. Tokens & Payments'],
    ['ai-output', '5. About What the AI Says'],
    ['your-content', '6. Your Content & Your Responsibility'],
    ['fair-use', '7. Acceptable Use'],
    ['third-party', '8. Third-Party Model Providers'],
    ['ip', '9. Intellectual Property'],
    ['privacy', '10. Privacy'],
    ['termination', '11. Ending Things'],
    ['warranty', '12. Warranty Disclaimer'],
    ['liability', '13. Limitation of Liability'],
    ['indemnity', '14. Indemnification'],
    ['assumption-of-risk', '15. Assumption of Risk'],
    ['changes', '16. Changes to These Terms'],
    ['law', '17. Governing Law & Disputes'],
    ['contact', '18. Get in Touch'],
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png" alt="RoboHeard" className="h-7 w-7" />
            <span className="font-semibold">RoboHeard</span>
          </Link>
          <Link to="/auth"><Button size="sm">Open app</Button></Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20 max-w-3xl">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to home
        </Link>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3">
            <ScrollText className="h-3.5 w-3.5" />
            The official-but-readable bit
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-3">Terms & Conditions</h1>
          <p className="text-muted-foreground">
            Last updated {LAST_UPDATED}. We tried to keep these short and human. If anything is unclear, ask — we don't bite, and neither do the robots (we checked).
          </p>
        </div>

        <nav aria-label="Table of contents" className="mb-12 p-5 rounded-xl border border-border/60 bg-card/40">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="the-deal" title="1. The Deal">
          <p>
            RoboHeard ("we", "us", the orchestra conductor of eight frontier AI models) lets you ("you", the curious human at the keyboard) chat with multiple AIs at once, generate images, run market research, and compare model answers side-by-side. By using the service, you agree to these terms. If you don't, that's okay — close the tab and we'll part as friends.
          </p>
        </Section>

        <Section id="who-can-use" title="2. Who Can Use This">
          <p>
            You need to be at least 13 (or the digital-age-of-consent in your country, whichever is higher). If you're using RoboHeard for a company, you confirm you're allowed to bind that company to these terms. No, your goldfish cannot sign up. We checked.
          </p>
        </Section>

        <Section id="your-account" title="3. Your Account">
          <p>
            Keep your login credentials secret. You're responsible for activity under your account. If something looks off — unexpected logins, missing tokens, a suspicious haiku you didn't request — tell us immediately.
          </p>
        </Section>

        <Section id="tokens" title="4. Tokens & Payments">
          <p>
            RoboHeard runs on a token system. Tokens are consumed when models respond. Purchased tokens are generally non-refundable except where required by law — but if something genuinely went wrong (a model crashed, you were charged twice, the universe glitched), reach out and we'll sort it.
          </p>
          <p>Pricing and token costs may change as model providers adjust theirs. We'll keep the math transparent.</p>
        </Section>

        <Section id="ai-output" title="5. About What the AI Says">
          <p>
            AI models are powerful, occasionally brilliant, and sometimes confidently wrong. RoboHeard surfaces answers from frontier providers but does not guarantee accuracy, completeness, or that any model has any idea what it's talking about on a given Tuesday.
          </p>
          <p>
            Do not rely on AI output for medical, legal, financial, or other high-stakes decisions without consulting a qualified human. Treat outputs as a starting point, not a verdict.
          </p>
        </Section>

        <Section id="your-content" title="6. Your Content">
          <p>
            You own what you put in. By using RoboHeard you grant us a limited license to process your prompts and content solely to operate the service (sending them to the model providers you select, storing your chat history, etc.).
          </p>
          <p>Don't upload anything you don't have the right to share. That includes other people's secrets, copyrighted material you don't own, and your friend's bad poetry without permission.</p>
        </Section>

        <Section id="fair-use" title="7. Fair Use (a.k.a. Please Be Cool)">
          <p>Don't use RoboHeard to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Generate illegal content, harassment, CSAM, or anything designed to harm people.</li>
            <li>Build weapons, malware, or large-scale disinformation campaigns.</li>
            <li>Scrape, resell, or rebrand the service as your own.</li>
            <li>Try to extract other users' data, reverse-engineer the platform, or DDoS our poor servers.</li>
            <li>Pretend AI output is human-written in contexts where that matters (school, journalism, court).</li>
          </ul>
          <p>We may suspend or terminate accounts that violate this section. We'd rather not. Be cool.</p>
        </Section>

        <Section id="ip" title="8. Intellectual Property">
          <p>
            The RoboHeard name, logo, interface, and the conductor-of-models orchestration approach are ours. You get a license to use them as part of the service, not to slap them on a T-shirt and sell it at a market (unless we say so — we like T-shirts).
          </p>
        </Section>

        <Section id="privacy" title="9. Privacy">
          <p>
            We handle data according to our privacy practices. In short: we store what's needed to run your account and chats, we don't sell your data, and prompts you send go to the AI providers you selected. Model providers have their own policies.
          </p>
        </Section>

        <Section id="termination" title="10. Ending Things">
          <p>
            You can stop using RoboHeard anytime. We can suspend or terminate accounts for serious or repeated breaches of these terms. Sections that should reasonably survive termination (IP, liability, etc.) — survive.
          </p>
        </Section>

        <Section id="warranty" title="11. Warranties (or Lack Thereof)">
          <p>
            RoboHeard is provided "as is" and "as available". We don't promise uninterrupted, error-free, or telepathically-accurate service. To the maximum extent allowed by law, we disclaim implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
        </Section>

        <Section id="liability" title="12. Liability">
          <p>
            To the extent permitted by law, our total liability arising from your use of RoboHeard is limited to the amount you paid us in the 3 months before the claim. We are not liable for indirect, incidental, or consequential damages — including but not limited to lost profits, lost data, or existential dread caused by reading too many AI takes.
          </p>
        </Section>

        <Section id="changes" title="13. Changes to These Terms">
          <p>
            We may update these terms as the service evolves. Material changes will be flagged in-app or via email. Continued use after changes take effect means you accept them.
          </p>
        </Section>

        <Section id="law" title="14. Governing Law">
          <p>
            These terms are governed by the laws of the jurisdiction where RoboHeard is operated, without regard to conflict-of-law rules. Disputes go to the competent courts of that jurisdiction. If a clause is found invalid, the rest still stands.
          </p>
        </Section>

        <Section id="contact" title="15. Get in Touch">
          <p>
            Questions, concerns, or compliments for the conductor? Reach us through the in-app contact button or via the help page. A real human will reply — eventually, and politely.
          </p>
        </Section>

        <div className="mt-16 pt-8 border-t border-border/60 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-4">
          <p>That's it. Thanks for reading the whole thing — you're rarer than you think.</p>
          <Link to="/" className="text-foreground hover:text-primary transition-colors">← Back home</Link>
        </div>
      </main>
    </div>
  );
};

export default Terms;
