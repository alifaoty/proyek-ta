import axiosClient from './axiosClient';

export const getFinancialReport = (params) =>
  axiosClient.get('/reports/financial', { params });

export const getStockMutationsReport = (params) =>
  axiosClient.get('/reports/stock-mutations', { params });

export const getAuditTrailsReport = (params) =>
  axiosClient.get('/reports/audit-trails', { params });

export const exportReportFile = async (params) => {
  const response = await axiosClient.get('/reports/export', {
    params,
    responseType: 'blob',
  });

  const disposition = response.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const dateStr = String(params?.end_date || '')
    .replace(/-/g, '')
    .slice(0, 8) || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ext = params?.format === 'xlsx' ? 'xlsx' : 'pdf';
  const fallbackName = `Laporan_${params?.type || 'financial'}_${dateStr}.${ext}`;
  const filename = match?.[1] || fallbackName;

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);

  return filename;
};
