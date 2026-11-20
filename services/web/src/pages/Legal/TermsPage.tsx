import { Link } from 'react-router-dom';
import LegalLayout from '../../components/Legal/LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="October 18, 2026"
      intro="The rules for using Vigil. Please read them before creating or using an account."
    >
      <h2>1. Acceptance of these terms</h2>

      <p>
        By creating an account or using Vigil you agree to these Terms of
        Service and to our{' '}<Link to="/privacy">Privacy Policy</Link>. If you
        do not agree, do not use the service.
      </p>

      <h2>2. The service</h2>

      <p>
        Vigil is an observability platform that lets you collect, search and
        visualize logs, metrics and traces, configure alerts, and ask questions
        about your telemetry using AI Insights. Vigil is a student project built
        at 1337 (42 Network) and is provided as is, without a commitment to a
        particular level of availability or support.
      </p>

      <h2>3. Accounts and administrators</h2>

      <ul>
        <li>
          The first account created on an instance becomes its administrator
          and has full access to alerts, logs, metrics and traces.
        </li>
        <li>
          Further accounts are created by an administrator.
        </li>
        <li>
          You are responsible for keeping your credentials confidential and
          for everything done through your account. Tell the operator right
          away if you suspect unauthorized access.
        </li>
        <li>
          You must provide a valid email address and use a strong password.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>

      <p>
        You agree not to:
      </p>

      <ul>
        <li>
          Attempt to access accounts, data or systems you are not authorized
          to access.
        </li>
        <li>
          Probe, scan or test the vulnerability of the platform without
          permission.
        </li>
        <li>
          Overload the service or interfere with other users.
        </li>
        <li>
          Use Vigil for unlawful purposes or to process data you have no right
          to process.
        </li>
        <li>
          Reverse engineer or remove security protections except where the law
          allows it.
        </li>
      </ul>

      <h2>5. Your data and responsibilities</h2>

      <p>
        You keep ownership of the telemetry and content you send to Vigil. You
        are responsible for what your services emit: do not send passwords, API
        keys, payment data or personal data you do not have a legal basis to
        process. You give the operator permission to store and process that data
        only as needed to run the service.
      </p>

      <p>
        <strong>Development team’s role.</strong>{' '}The Vigil development team
        provides the software but does not operate your instance or receive,
        access, or control the account data, telemetry, configuration, or AI
        Insights content processed by it. The operator is responsible for the
        instance’s deployment, configuration, security, backups, retention, and
        compliance with applicable data-protection requirements. Providing the
        software does not make the development team responsible for
        administering or safeguarding your instance or its data.
      </p>

      <h2>6. AI Insights</h2>

      <p>
        AI-generated answers can be wrong, incomplete or out of date. Check them
        against your actual logs, metrics and traces before acting, especially
        during production incidents. Do not rely on AI Insights as your only
        source for critical decisions.
      </p>

      <h2>7. Intellectual property</h2>

      <p>
        The Vigil name, interface and code remain the property of their authors
        and are used under the license that accompanies the project. Nothing in
        these terms transfers ownership of your data to us or of our software to
        you.
      </p>

      <h2>8. Suspension and termination</h2>

      <p>
        An administrator may suspend or delete accounts that break these terms
        or put the platform at risk. You may stop using Vigil at any time and
        ask for your account to be deleted.
      </p>

      <h2>9. Disclaimer and limitation of liability</h2>

      <p>
        Vigil is provided “as is” and “as available” without warranties of any
        kind. We do not guarantee that it will be uninterrupted, error free, or
        that alerts will always fire or be delivered. To the maximum extent
        permitted by law, the authors and operator are not liable for indirect
        or consequential losses, including missed incidents, downtime or data
        loss, arising from your use of the service.
      </p>

      <p>
        To the maximum extent permitted by applicable law, the Vigil development
        team is not liable for loss, disclosure, alteration, or unauthorized
        access to data processed by an operator’s instance. Nothing in these
        terms excludes or limits liability that cannot lawfully be excluded or
        limited.
      </p>

      <h2>10. Changes to these terms</h2>

      <p>
        We may update these terms. The date at the top shows the latest
        revision, and continued use after a change means you accept the updated
        terms.
      </p>

      <h2>11. Governing law and contact</h2>

      <p>
        These terms are governed by the laws of Morocco. Questions can be sent
        to the person or organization operating your Vigil instance.
      </p>

    </LegalLayout>
  );
}
