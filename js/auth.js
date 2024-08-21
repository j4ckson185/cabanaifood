import { API_BASE_URL } from './config.js';

export async function obterTokenAutenticacao() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`Falha na autenticação: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.accessToken;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        throw error;
    }
}