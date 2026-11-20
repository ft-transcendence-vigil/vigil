import { Link } from 'react-router-dom';
import LegalLayout from '../../components/Legal/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="October 18, 2026"
      intro="This policy explains what personal data a self-hosted Vigil instance processes, why, and what control you have over it."
    >
      <h2>1. Who this policy covers</h2>

      <p>
        Vigil is a self-hosted observability platform that collects and displays
        logs, metrics, traces and alerts from the services you connect to it. It
        was built by a student team as part of the ft_transcendence project at
        1337 (42 Network).
      </p>

      <p>
        Because Vigil is deployed by whoever runs it, the person or organization
        operating your instance (the “operator”) decides what data is sent to it
        and is responsible for it. This policy explains what the Vigil software
        processes and how it handles that data. The Vigil development team does
        not receive or have access to your account credentials or data stored in
        your instance merely because you use the software. Vigil does not send
        analytics or error reports to the development team.
      </p>

      <h2>2. Data processed by your Vigil instance</h2>

      <p>
        <strong>Account data.</strong>{' '}Your email address and password are
        submitted to your Vigil instance for account creation and
        authentication. That instance stores your email address and a salted
        password hash, not your plaintext password. The operator controls this
        data; the Vigil development team does not receive or have access to
        these credentials. The first account created on an instance becomes the
        administrator. Additional accounts are created by an administrator from
        inside Vigil.
      </p>

      <p>
        <strong>Telemetry data.</strong>{' '}Logs, metrics and traces sent by
        the services you connect are stored and processed within infrastructure
        controlled by your instance’s operator. The Vigil development team does
        not receive or have access to this telemetry. Telemetry can contain
        personal data depending on what your applications emit, such as user
        identifiers, IP addresses or request details. The operator is
        responsible for deciding what data is sent to the instance.
      </p>

      <p>
        <strong>Configuration data.</strong>{' '}Service names, connection
        settings, alert rules and notification settings you create are stored
        and processed by your Vigil instance under the operator’s control. This
        data is not sent to the Vigil development team.
      </p>

      <p>
        <strong>Session and technical data.</strong>{' '}Authentication tokens
        or session cookies needed to keep you signed in, and server-side logs of
        requests and errors held by the operator for security and debugging.
        These logs are not sent to the Vigil development team.
      </p>

      <p>
        <strong>AI Insights data.</strong>{' '}When you use AI Insights, the
        messages you type and the telemetry context selected to answer them are
        processed by a self-hosted AI model run by your instance’s operator to
        generate a reply. These messages and telemetry context are not sent to
        the Vigil development team.
      </p>

      <h2>3. How your instance uses data</h2>

      <ul>
        <li>
          To authenticate you and control what you can access.
        </li>
        <li>
          To store, search and visualize your telemetry and to evaluate alert
          rules.
        </li>
        <li>
          To answer your questions in AI Insights.
        </li>
        <li>
          To secure the platform, detect abuse and diagnose faults.
        </li>
      </ul>

      <h2>4. AI Insights and third parties</h2>

      <p>
        AI Insights processes your prompts and relevant telemetry context using
        a self-hosted AI model run by your instance’s operator. AI Insights does
        not send this data to the Vigil development team or an external AI
        provider. Do not include secrets or data you are not authorized to
        process in prompts. The Vigil software does not sell your data or use it
        for advertising. The operator is responsible for any additional sharing
        through integrations or services they configure.
      </p>

      <h2>5. Cookies and local storage</h2>

      <p>
        Vigil uses only what is strictly necessary to work: a session cookie or
        token to keep you signed in, and local browser storage for interface
        preferences such as language. Vigil does not use advertising or
        cross-site tracking cookies.
      </p>

      <h2>6. Security</h2>

      <p>
        Connections to Vigil are intended to run over HTTPS/TLS. Passwords are
        hashed, access is restricted by account role, and administrator actions
        are limited to administrators. No system is perfectly secure; if you
        believe your account has been compromised, contact the operator
        immediately and change your password.
      </p>

      <h2>7. Retention and deletion</h2>

      <p>
        Account data is kept while your account exists. Telemetry is kept for
        the retention period configured by the operator and then removed. An
        administrator can delete an account, and you can ask the operator to
        delete your account and any personal data tied to it.
      </p>

      <h2>8. Your rights</h2>

      <p>
        Depending on where you live (including under the GDPR and Morocco’s Law
        09-08), you may have the right to access, correct, delete, restrict or
        export your personal data, and to object to its processing. To exercise
        these rights, contact the person or organization operating your Vigil
        instance.
      </p>

      <h2>9. Children</h2>

      <p>
        Vigil is a professional tool and is not directed at children under 16.
        Operators are responsible for ensuring that account creation complies
        with applicable age requirements.
      </p>

      <h2>10. Changes to this policy</h2>

      <p>
        We may update this policy as Vigil changes. The date at the top shows
        the latest revision.
      </p>

      <h2>11. Contact</h2>

      <p>
        Questions about this policy: the person or organization operating your
        Vigil instance. See also our{' '}<Link to="/terms">Terms of
        Service</Link>.
      </p>

    </LegalLayout>
  );
}
