import axiosClient from './axiosClient';

export const getExpenses = (params) =>
  axiosClient.get('/expenses', { params });

export const createExpense = (payload) =>
  axiosClient.post('/expenses', payload);

export const updateExpense = (id, payload) =>
  axiosClient.put(`/expenses/${id}`, payload);

export const deleteExpense = (id) =>
  axiosClient.delete(`/expenses/${id}`);
