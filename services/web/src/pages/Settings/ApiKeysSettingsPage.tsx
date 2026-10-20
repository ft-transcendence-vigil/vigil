import ApiKeyCard from '../../components/Settings/ApiKeyCard';
import CardLayout from '../../components/Settings/CardLayout';
import useApiKeySettings from '../../hooks/useApiKeySettings';

export default function ApiKeysSettingsPage() {
  const { apiKeys, error } = useApiKeySettings();
  const generalApiKey = error
    ? 'Failed to load API key'
    : (apiKeys?.api_key ?? '');
  const ingestionApiKey = error
    ? 'Failed to load ingestion key'
    : (apiKeys?.ingestion_key ?? '');

  return (
    <div className="api-keys-settings flex flex-col space-y-5">
      <CardLayout
        title="API Keys"
        description="Use these keys to authenticate external integrations and telemetry ingestion."
      >
        <ApiKeyCard
          title="General-purpose API Key"
          apiKey={generalApiKey}
          info="Use this key to authenticate requests to the public API (as an alternative to JWT)."
        />
        <br />
        <ApiKeyCard
          title="Telemetry Ingestion Key"
          apiKey={ingestionApiKey}
          info="Configure your services/collectors to present this key when pushing logs, metrics, and traces."
        />
        <div className="text-[12px] md:text-[14px] text-vigil-muted-extra border-t border-t-vigil-border pt-3 mt-3 tracking-wide">
          These keys are managed by your infrastructure configuration and cannot
          be changed here.
        </div>
      </CardLayout>
    </div>
  );
}
