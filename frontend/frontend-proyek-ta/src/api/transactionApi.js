import axiosClient from './axiosClient';

export const createCashTransaction = (payload) =>
  axiosClient.post('/transactions', payload);

export const createQrisTransaction = (payload) =>
  axiosClient.post('/transactions/charge-qris', payload);

export const getTransactions = (params) =>
  axiosClient.get('/transactions', { params });

export const getTransactionById = (id) =>
  axiosClient.get(`/transactions/${id}`);

