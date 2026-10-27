export type InstrumentationSetup = 'recommended' | 'existing';
export type ServiceLanguage =
  | ''
  | 'java'
  | 'node'
  | 'python'
  | 'dotnet'
  | 'go'
  | 'other';
export type TlsMode = 'unknown' | 'local' | 'public';
export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface GuideStep {
  title: string;
  detail: string;
  language?: string;
  code?: string;
  link?: string;
  linkLabel?: string;
}

export interface InstrumentationGuide {
  docs: string;
  steps: GuideStep[];
  launch: {
    title: string;
    detail: string;
    language?: string;
    code?: string;
  };
}

export interface TelemetryProfile {
  caEnv?: string;
  note: string;
  caHelp: string;
}

export const STEP_LABELS: Record<OnboardingStep, string> = {
  1: 'SETUP',
  2: 'LANGUAGE',
  3: 'INSTRUMENT',
  4: 'NAME',
  5: 'SECURE',
  6: 'DETAILS',
  7: 'CONFIGURE',
  8: 'TRUST',
  9: 'EXPORTER',
  10: 'LAUNCH',
  11: 'VERIFY',
};

export const instrumentationGuides: Record<
  Exclude<ServiceLanguage, ''>,
  InstrumentationGuide
> = {
  java: {
    docs: 'https://opentelemetry.io/docs/zero-code/java/agent/getting-started/',
    steps: [
      {
        title: 'Download the Java agent',
        detail:
          'Download the OpenTelemetry Java agent and place or mount it where the JVM can read it.',
        link: 'https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases',
        linkLabel: 'Java agent releases ↗',
      },
    ],
    launch: {
      title: 'Launch your instrumented service',
      detail:
        'Apply the generated environment variables, preserve existing JVM options, then launch the application normally.',
      language: 'Shell',
      code: 'java -jar myapp.jar',
    },
  },
  node: {
    docs: 'https://opentelemetry.io/docs/zero-code/js/',
    steps: [
      {
        title: 'Install Node.js instrumentation',
        detail:
          'Install and activate the official Node.js auto-instrumentation package for your existing startup method.',
        language: 'Shell',
        code: 'npm install --save @opentelemetry/auto-instrumentations-node',
      },
    ],
    launch: {
      title: 'Launch your instrumented service',
      detail:
        'Apply the generated VIGIL connection settings and start the service using its normal command.',
    },
  },
  python: {
    docs: 'https://opentelemetry.io/docs/zero-code/python/',
    steps: [
      {
        title: 'Install Python instrumentation',
        detail:
          'Install the OpenTelemetry distro and OTLP exporter, then bootstrap instrumentation for installed supported libraries.',
        language: 'Shell',
        code: 'python -m pip install opentelemetry-distro opentelemetry-exporter-otlp\nopentelemetry-bootstrap -a install',
      },
    ],
    launch: {
      title: 'Launch your instrumented service',
      detail:
        'Apply the generated environment variables and run the application through the OpenTelemetry wrapper.',
      language: 'Shell',
      code: 'opentelemetry-instrument python myapp.py',
    },
  },
  dotnet: {
    docs: 'https://opentelemetry.io/docs/languages/dotnet/exporters/',
    steps: [
      {
        title: 'Install OpenTelemetry packages',
        detail:
          'Install the OpenTelemetry hosting, OTLP exporter, and instrumentation packages your service needs.',
      },
    ],
    launch: {
      title: 'Launch your instrumented service',
      detail:
        'Apply the generated environment variables, restart the application, and generate normal traffic.',
      language: 'Shell',
      code: 'dotnet run',
    },
  },
  go: {
    docs: 'https://opentelemetry.io/docs/languages/go/exporters/',
    steps: [
      {
        title: 'Install and initialize OpenTelemetry',
        detail:
          'Add the OTLP/HTTP exporters and initialize the providers used by your application.',
      },
    ],
    launch: {
      title: 'Launch your instrumented service',
      detail: 'Apply the generated settings and run the application normally.',
      language: 'Shell',
      code: 'go run .',
    },
  },
  other: {
    docs: 'https://opentelemetry.io/docs/languages/',
    steps: [
      {
        title: 'Use your language OpenTelemetry SDK',
        detail:
          'Configure OTLP/HTTP exporters for the signals your application emits, then apply the VIGIL connection settings generated later.',
      },
    ],
    launch: {
      title: 'Launch your instrumented service',
      detail:
        'Apply the generated settings and start the application normally.',
    },
  },
};

export const existingInstrumentationGuide: InstrumentationGuide = {
  docs: 'https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/',
  steps: [
    {
      title: 'Keep your existing OpenTelemetry setup',
      detail:
        'Do not initialize another SDK or attach a second agent. Apply VIGIL connection settings to the exporter you already use.',
    },
  ],
  launch: {
    title: 'Restart your instrumented service',
    detail:
      'Apply the generated endpoint, authentication, service name, and trust settings, then restart normally and generate representative traffic.',
  },
};

export const telemetryProfiles: Record<
  Exclude<ServiceLanguage, ''>,
  TelemetryProfile
> = {
  java: {
    caEnv: 'OTEL_EXPORTER_OTLP_CERTIFICATE',
    note: 'The recommended setup uses the Java agent. Merge its JAVA_TOOL_OPTIONS value with any existing JVM options.',
    caHelp:
      'Point OTEL_EXPORTER_OTLP_CERTIFICATE to the VIGIL CA PEM file and keep hostname verification enabled.',
  },
  node: {
    caEnv: 'NODE_EXTRA_CA_CERTS',
    note: 'Keep your normal Node.js startup command and apply VIGIL connection settings before the process starts.',
    caHelp:
      'NODE_EXTRA_CA_CERTS extends Node.js trust roots with the VIGIL CA PEM file.',
  },
  python: {
    caEnv: 'OTEL_EXPORTER_OTLP_CERTIFICATE',
    note: 'The recommended setup launches through opentelemetry-instrument.',
    caHelp: 'Point OTEL_EXPORTER_OTLP_CERTIFICATE to the VIGIL CA PEM file.',
  },
  dotnet: {
    caEnv: 'OTEL_EXPORTER_OTLP_CERTIFICATE',
    note: 'Use the exporter configuration already registered by your .NET service.',
    caHelp: 'Point OTEL_EXPORTER_OTLP_CERTIFICATE to the VIGIL CA PEM file.',
  },
  go: {
    note: 'Go exporter trust can be configured in code if your setup does not use a CA environment variable.',
    caHelp:
      'Pass the VIGIL CA through the exporter TLS credentials used by the sending process.',
  },
  other: {
    note: 'Keep the application existing startup model and configure its OTLP/HTTP exporter.',
    caHelp:
      'Use the trusted-CA option supported by the SDK or exporter that opens the HTTPS connection.',
  },
};
