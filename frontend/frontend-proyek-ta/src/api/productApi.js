import axiosClient from './axiosClient';

export const getProducts = (params) => axiosClient.get('/products', { params });

export const getProductById = (id) => axiosClient.get(`/products/${id}`);

export const createProduct = (data) => axiosClient.post('/products', data);

export const updateProduct = (id, data) => axiosClient.put(`/products/${id}`, data);

export const deleteProduct = (id) => axiosClient.delete(`/products/${id}`);

