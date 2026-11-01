import axiosClient from './axiosClient';

export const createInbound = (payload) => axiosClient.post('/inventory/inbound', payload);

export const createOutbound = (payload) => axiosClient.post('/inventory/outbound', payload);

export const getMutations = (params) => axiosClient.get('/inventory/mutations', { params });

