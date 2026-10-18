import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../shared/Logo';

const CONTACT_EMAIL = 'privacy@vigil.com';
const LAST_UPDATED = 'October 18, 2026';

const link = 'text-blue-400 hover:underline';

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-8 mb-2 text-xl font-semibold text-white">{children}</h2>
  );
}
function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[#c3cae0] leading-7">{children}</p>;
}
function UL({ items }: { items: string[] }) {
  return (
    <ul className="mb-3 list-disc pl-6 text-[#c3cae0] leading-7">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
      {CONTACT_EMAIL}
    </a>
  );
}
function DocHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <>
      <p className="mt-12 mb-2 text-xs uppercase tracking-[0.18em] text-vigil-muted">
        Vigil Observability · Legal
      </p>
      <h1 className="mb-2 text-3xl sm:text-4xl font-semibold text-white">
        {title}
      </h1>
      <p className="mb-4 text-sm text-vigil-muted">
        Last updated: {LAST_UPDATED}
      </p>
      <P>{intro}</P>
    </>
  );
}

export default function LegalPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash)
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <div className="min-h-screen bg-[#0d111a] text-[#c3cae0]">
      <header className="sticky top-0 z-10 border-b border-[#1b2236] bg-[#0d111a]/90 backdrop-blur py-2">
        <div className="mx-auto flex max-w-205 flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/">
            <Logo className="text-3xl px-4 py-1" />
          </Link>
          <nav className="flex gap-6 text-[13px] uppercase tracking-[0.12em] text-vigil-muted">
            <a href="#privacy" className="hover:text-blue-400">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-blue-400">
              Terms of Service
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-205 px-6 pb-12">
        <article id="privacy" className="scroll-mt-20">
          <DocHeader
            title="Privacy Policy"
            intro="This policy explains what personal data Vigil collects, why, and what control you have over it."
          />

          <H2>1. Who this policy covers</H2>
          <P>
            Vigil is a self-hosted observability platform that collects and
            displays logs, metrics, traces and alerts from the services you
            connect to it. It was built by a student team as part of the
            ft_transcendence project at 1337 (42 Network).
          </P>
          <P>
            Because Vigil is deployed by whoever runs it, the person or
            organization operating your instance (the “operator”) decides what
            data is sent to it and is responsible for it. This policy explains
            what the Vigil software itself collects and how it handles that
            data.
          </P>

          <H2>2. Data we collect</H2>
          <P>
            <strong>Account data.</strong> Your email address and a password.
            Passwords are never stored in plain text; only a salted hash is
            kept. The first account created on an instance becomes the
            administrator. Additional accounts are created by an administrator
            from inside Vigil.
          </P>
          <P>
            <strong>Telemetry data.</strong> Logs, metrics and traces sent to
            Vigil by the services you connect through OpenTelemetry, stored in
            ClickHouse. Telemetry can contain personal data depending on what
            your applications emit (for example user identifiers, IP addresses
            or request details). Vigil does not decide what your services send.
          </P>
          <P>
            <strong>Configuration data.</strong> Service names, connection
            settings, alert rules and notification settings you create.
          </P>
          <P>
            <strong>Session and technical data.</strong> Authentication tokens
            or session cookies needed to keep you signed in, and server-side
            logs of requests and errors used for security and debugging.
          </P>
          <P>
            <strong>AI Insights data.</strong> When you use AI Insights, the
            messages you type and the telemetry context selected to answer them
            are processed to generate a reply.
          </P>

          <H2>3. How we use your data</H2>
          <UL
            items={[
              'To authenticate you and control what you can access.',
              'To store, search and visualize your telemetry and to evaluate alert rules.',
              'To answer your questions in AI Insights.',
              'To secure the platform, detect abuse and diagnose faults.',
            ]}
          />

          <H2>4. AI Insights and third parties</H2>
          <P>
            Generating AI replies requires sending your prompt and the relevant
            telemetry context to the AI model provider configured by the
            operator. Do not include secrets or data you are not allowed to
            share in prompts. Outside of that, Vigil does not sell your data,
            does not use it for advertising and does not share it with third
            parties. If your operator has not configured an AI provider, AI
            Insights does not send data anywhere.
          </P>

          <H2>5. Cookies and local storage</H2>
          <P>
            Vigil uses only what is strictly necessary to work: a session cookie
            or token to keep you signed in, and local browser storage for
            interface preferences such as language. Vigil does not use
            advertising or cross-site tracking cookies.
          </P>

          <H2>6. Security</H2>
          <P>
            Connections to Vigil are intended to run over HTTPS/TLS. Passwords
            are hashed, access is restricted by account role, and administrator
            actions are limited to administrators. No system is perfectly
            secure; if you believe your account has been compromised, contact
            the operator immediately and change your password.
          </P>

          <H2>7. Retention and deletion</H2>
          <P>
            Account data is kept while your account exists. Telemetry is kept
            for the retention period configured by the operator and then
            removed. An administrator can delete an account, and you can ask the
            operator to delete your account and any personal data tied to it.
          </P>

          <H2>8. Your rights</H2>
          <P>
            Depending on where you live (including under the GDPR and Morocco’s
            Law 09-08), you may have the right to access, correct, delete,
            restrict or export your personal data, and to object to its
            processing. To exercise these rights, contact <Mail />.
          </P>

          <H2>9. Children</H2>
          <P>
            Vigil is a professional tool and is not directed at children under
            16. We do not knowingly create accounts for them.
          </P>

          <H2>10. Changes to this policy</H2>
          <P>
            We may update this policy as Vigil changes. The date at the top
            shows the latest revision. Significant changes will be announced
            inside the application.
          </P>

          <H2>11. Contact</H2>
          <P>
            Questions about this policy: <Mail />. See also our{' '}
            <a href="#terms" className={link}>
              Terms of Service
            </a>
            .
          </P>
        </article>

        <article
          id="terms"
          className="mt-18 scroll-mt-20 border-t border-[#1b2236]"
        >
          <DocHeader
            title="Terms of Service"
            intro="The rules for using Vigil. Please read them before creating or using an account."
          />

          <H2>1. Acceptance of these terms</H2>
          <P>
            By creating an account or using Vigil you agree to these Terms of
            Service and to our{' '}
            <a href="#privacy" className={link}>
              Privacy Policy
            </a>
            . If you do not agree, do not use the service.
          </P>

          <H2>2. The service</H2>
          <P>
            Vigil is an observability platform that lets you collect, search and
            visualize logs, metrics and traces, configure alerts, and ask
            questions about your telemetry using AI Insights. Vigil is a student
            project built at 1337 (42 Network) and is provided as is, without a
            commitment to a particular level of availability or support.
          </P>

          <H2>3. Accounts and administrators</H2>
          <UL
            items={[
              'The first account created on an instance becomes its administrator and has full access to alerts, logs, metrics and traces.',
              'Further accounts are created by an administrator.',
              'You are responsible for keeping your credentials confidential and for everything done through your account. Tell the operator right away if you suspect unauthorized access.',
              'You must provide a valid email address and use a strong password.',
            ]}
          />

          <H2>4. Acceptable use</H2>
          <P>You agree not to:</P>
          <UL
            items={[
              'Attempt to access accounts, data or systems you are not authorized to access.',
              'Probe, scan or test the vulnerability of the platform without permission.',
              'Overload the service or interfere with other users.',
              'Use Vigil for unlawful purposes or to process data you have no right to process.',
              'Reverse engineer or remove security protections except where the law allows it.',
            ]}
          />

          <H2>5. Your data and responsibilities</H2>
          <P>
            You keep ownership of the telemetry and content you send to Vigil.
            You are responsible for what your services emit: do not send
            passwords, API keys, payment data or personal data you do not have a
            legal basis to process. You give the operator permission to store
            and process that data only as needed to run the service.
          </P>

          <H2>6. AI Insights</H2>
          <P>
            AI-generated answers can be wrong, incomplete or out of date. Check
            them against your actual logs, metrics and traces before acting,
            especially during production incidents. Do not rely on AI Insights
            as your only source for critical decisions.
          </P>

          <H2>7. Intellectual property</H2>
          <P>
            The Vigil name, interface and code remain the property of their
            authors and are used under the license that accompanies the project.
            Nothing in these terms transfers ownership of your data to us or of
            our software to you.
          </P>

          <H2>8. Suspension and termination</H2>
          <P>
            An administrator may suspend or delete accounts that break these
            terms or put the platform at risk. You may stop using Vigil at any
            time and ask for your account to be deleted.
          </P>

          <H2>9. Disclaimer and limitation of liability</H2>
          <P>
            Vigil is provided “as is” and “as available” without warranties of
            any kind. We do not guarantee that it will be uninterrupted, error
            free, or that alerts will always fire or be delivered. To the
            maximum extent permitted by law, the authors and operator are not
            liable for indirect or consequential losses, including missed
            incidents, downtime or data loss, arising from your use of the
            service.
          </P>

          <H2>10. Changes to these terms</H2>
          <P>
            We may update these terms. The date at the top shows the latest
            revision, and continued use after a change means you accept the
            updated terms.
          </P>

          <H2>11. Governing law and contact</H2>
          <P>
            These terms are governed by the laws of Morocco. Questions can be
            sent to <Mail />.
          </P>
        </article>
      </main>

      <footer className="mx-auto flex max-w-205 flex-wrap justify-between gap-3 border-t border-[#1b2236] px-6 py-6 text-xs uppercase tracking-[0.14em] text-vigil-muted">
        <span>Vigil Observability · Secure Access</span>
        <nav className="flex gap-6">
          <a href="#privacy" className="hover:text-blue-400">
            Privacy Policy
          </a>
          <a href="#terms" className="hover:text-blue-400">
            Terms of Service
          </a>
        </nav>
      </footer>
    </div>
  );
}
