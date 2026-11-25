import axiosClient from './axiosClient';

export const getOwnerSummary = () =>
  axiosClient.get('/dashboard/owner-summary');
