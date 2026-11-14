import { Document, Page, Text, pdf } from '@react-pdf/renderer';

interface Data {
  period: string;
  critical: number;
  warning: number;
  unacknowledged: number;
  healthy: number;
  services: number;
}

export async function exportOverviewPdf(data: Data) {
  const report = (
    <Document>
      <Page size="A4" style={{ padding: 45, fontSize: 12 }}>
        <Text style={{ fontSize: 24, marginBottom: 15 }}>
          VIGIL - Overview Report
        </Text>
        <Text>Period: {data.period}</Text>
        <Text>Generated: {new Date().toLocaleString()}</Text>
        <Text style={{ fontSize: 17, marginTop: 30, marginBottom: 15 }}>
          System Summary
        </Text>
        <Text>Monitored Services: {data.services}</Text>
        <Text>Healthy Services: {data.healthy}</Text>
        <Text>Critical Alerts: {data.critical}</Text>
        <Text>Warning Alerts: {data.warning}</Text>
        <Text>Unacknowledged Alerts: {data.unacknowledged}</Text>
        <Text style={{ fontSize: 17, marginTop: 30, marginBottom: 15 }}>
          Conclusion
        </Text>
        <Text>
          {data.critical > 0
            ? 'Critical alerts were observed and require investigation.'
            : 'No critical alerts were found in the loaded data.'}
        </Text>
        <Text style={{ marginTop: 30, fontSize: 9, color: 'gray' }}>
          Based on currently loaded dashboard data. Statistics may be
          incomplete.
        </Text>
      </Page>
    </Document>
  );

  const blob = await pdf(report).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'vigil-overview-report.pdf';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
