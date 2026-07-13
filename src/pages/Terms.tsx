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
            <img src="/lovable-uploads/8f377fa8-bfb6-4d05-b000-3d477e975e49.png" alt="RoboHeard AI model orchestrator logo" className="h-7 w-7" />
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
            AI models are powerful, occasionally brilliant, and sometimes confidently wrong. RoboHeard surfaces answers from third-party frontier providers and <strong className="text-foreground">makes no representation or warranty</strong> as to the accuracy, completeness, timeliness, legality, safety, or fitness for any purpose of any output. Outputs may be biased, hallucinated, offensive, factually incorrect, or outdated.
          </p>
          <p>
            <strong className="text-foreground">No professional advice.</strong> Nothing produced by RoboHeard constitutes medical, legal, financial, tax, psychological, engineering, safety, or other professional advice. Do not use outputs as the sole basis for any decision with real-world consequences. Always consult a qualified licensed professional.
          </p>
          <p>
            <strong className="text-foreground">You verify before you act.</strong> You are solely responsible for reviewing, fact-checking, and validating any output before relying on, publishing, distributing, or acting upon it. Any decision you make based on AI output is made at your own risk.
          </p>
        </Section>

        <Section id="your-content" title="6. Your Content & Your Responsibility">
          <p>
            You retain ownership of the prompts, files, and content you submit ("Your Content"). You grant us a worldwide, non-exclusive, royalty-free license to host, process, transmit, and display Your Content solely to operate and improve the service, including forwarding it to the AI providers you select.
          </p>
          <p>
            <strong className="text-foreground">You represent and warrant</strong> that: (a) you own or have all necessary rights, licenses, consents, and permissions to submit Your Content; (b) Your Content and your use of any output does not and will not violate any law, contract, intellectual property right, privacy right, publicity right, or third-party right; and (c) you are solely responsible for Your Content and any consequences of submitting it.
          </p>
          <p>
            <strong className="text-foreground">You are solely responsible</strong> for any output you generate, save, download, share, publish, or otherwise use, including any commercial use. We do not pre-screen, endorse, or guarantee the originality, non-infringement, or legality of any output.
          </p>
        </Section>

        <Section id="fair-use" title="7. Acceptable Use">
          <p>You agree NOT to use RoboHeard, directly or indirectly, to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Violate any applicable law, regulation, sanction, or third-party right.</li>
            <li>Generate, request, or distribute child sexual abuse material (CSAM), non-consensual intimate imagery, terrorist content, or content depicting real-world violence against identifiable people.</li>
            <li>Harass, defame, threaten, stalk, dox, or impersonate any person or entity.</li>
            <li>Generate malware, exploits, phishing content, or instructions to build weapons (chemical, biological, radiological, nuclear, or conventional capable of mass harm).</li>
            <li>Produce content that infringes copyright, trademark, trade secret, patent, or other intellectual property rights.</li>
            <li>Process biometric data, health data, government IDs, or other sensitive personal data without lawful basis and proper consent.</li>
            <li>Generate deepfakes, voice clones, or synthetic media of real people without their verifiable consent, or for fraud, election interference, or market manipulation.</li>
            <li>Conduct automated scraping, reverse engineering, model extraction, security probing, or denial-of-service attacks against the service.</li>
            <li>Misrepresent AI output as human-generated where such disclosure is legally or ethically required (academic, journalistic, judicial, regulatory contexts).</li>
            <li>Resell, sublicense, white-label, or build a competing AI aggregation service using our output.</li>
          </ul>
          <p>
            <strong className="text-foreground">Enforcement.</strong> We may, at our sole discretion and without notice, remove content, throttle, suspend, or permanently terminate accounts, and cooperate with law enforcement regarding any suspected violation. You waive any claim against us arising from such enforcement.
          </p>
        </Section>

        <Section id="third-party" title="8. Third-Party Model Providers">
          <p>
            RoboHeard routes prompts to third-party AI providers (including but not limited to OpenAI, Anthropic, Google, xAI, Mistral, DeepSeek, Perplexity, and Alibaba/Qwen). Your use of those models is also subject to the respective provider's terms and usage policies. We are not responsible for outages, output, policy changes, data handling, or any act or omission of any third-party provider, and we disclaim all liability arising from them.
          </p>
        </Section>

        <Section id="ip" title="9. Intellectual Property">
          <p>
            The RoboHeard name, logo, interface, source code, design, and orchestration methodology are owned by us or our licensors and protected by intellectual property laws. We grant you a limited, revocable, non-exclusive, non-transferable license to use the service for its intended purpose. All rights not expressly granted are reserved.
          </p>
          <p>
            Ownership of AI-generated output as between you and us is yours to the extent permitted by law and the applicable provider's terms — but we make no warranty that any output is original, non-infringing, or copyrightable.
          </p>
        </Section>

        <Section id="privacy" title="10. Privacy">
          <p>
            We process personal data as described in our privacy practices. Prompts and content you submit are transmitted to the AI providers you select; each provider has its own data handling. Do not submit confidential, regulated, or sensitive information you are not authorized to share with such providers.
          </p>
        </Section>

        <Section id="termination" title="11. Ending Things">
          <p>
            You may stop using RoboHeard at any time. We may suspend or terminate your access immediately, with or without notice, for any reason, including suspected breach of these terms. Upon termination, your right to use the service ceases. Sections that by their nature should survive (IP, disclaimers, liability, indemnity, governing law) survive termination.
          </p>
        </Section>

        <Section id="warranty" title="12. Warranty Disclaimer">
          <p className="uppercase text-xs tracking-wider text-foreground font-medium">Important — please read.</p>
          <p>
            THE SERVICE AND ALL OUTPUTS ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS, IMPLIED, OR STATUTORY. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, QUIET ENJOYMENT, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.
          </p>
          <p>
            WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, ERROR-FREE, OR THAT ANY OUTPUT WILL BE ACCURATE, RELIABLE, COMPLETE, LAWFUL, OR SUITABLE FOR YOUR PURPOSE.
          </p>
        </Section>

        <Section id="liability" title="13. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ROBOHEARD, ITS OWNERS, OPERATORS, AFFILIATES, OFFICERS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES; OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, BUSINESS OPPORTUNITY, OR REPUTATIONAL HARM, WHETHER BASED ON CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER THEORY, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) USD $50.
          </p>
          <p>
            Some jurisdictions do not allow certain limitations; in those jurisdictions, our liability is limited to the smallest extent permitted by law.
          </p>
        </Section>

        <Section id="indemnity" title="14. Indemnification">
          <p>
            <strong className="text-foreground">You agree to defend, indemnify, and hold harmless</strong> RoboHeard and its owners, operators, affiliates, officers, directors, employees, contractors, agents, and licensors from and against any and all claims, demands, actions, investigations, liabilities, damages, losses, judgments, fines, penalties, costs, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>your access to or use of the service;</li>
            <li>Your Content or any output you generate, save, share, publish, or act upon;</li>
            <li>your violation of these terms, applicable law, or any third-party right (including intellectual property, privacy, publicity, or contractual rights);</li>
            <li>any decision you make or action you take in reliance on AI output;</li>
            <li>your misrepresentation of AI output as human-generated, or vice versa;</li>
            <li>any dispute between you and a third party arising from your use of the service.</li>
          </ul>
          <p>
            We reserve the right, at our own expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, in which case you agree to cooperate with our defense.
          </p>
        </Section>

        <Section id="assumption-of-risk" title="15. Assumption of Risk">
          <p>
            You acknowledge that generative AI is an emerging technology with known and unknown risks, including hallucination, bias, factual error, copyright uncertainty, prompt-injection, and unexpected outputs. <strong className="text-foreground">You knowingly and voluntarily assume all such risks</strong> when using the service. You agree that any loss or harm you suffer in connection with AI output is your responsibility, not ours.
          </p>
        </Section>

        <Section id="changes" title="16. Changes to These Terms">
          <p>
            We may update these terms as the service evolves or as legal requirements change. Material changes will be flagged in-app or via email. Continued use after changes take effect constitutes acceptance.
          </p>
        </Section>

        <Section id="law" title="17. Governing Law & Disputes">
          <p>
            These terms are governed by the laws of the jurisdiction in which RoboHeard is operated, without regard to conflict-of-law principles. The United Nations Convention on Contracts for the International Sale of Goods does not apply.
          </p>
          <p>
            Any dispute, controversy, or claim arising out of or relating to these terms or the service shall be brought exclusively in the competent courts of that jurisdiction, and you consent to personal jurisdiction there. <strong className="text-foreground">You agree to resolve disputes on an individual basis and waive any right to participate in a class action, collective action, or representative proceeding.</strong>
          </p>
          <p>
            Any claim must be filed within one (1) year after the cause of action arose, or be permanently barred. If any provision of these terms is found unenforceable, the remaining provisions remain in full effect.
          </p>
        </Section>

        <Section id="contact" title="18. Get in Touch">
          <p>
            Questions, concerns, legal notices, or compliments for the conductor? Reach us through the in-app contact button or the help page. A real human will reply — eventually, and politely.
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
