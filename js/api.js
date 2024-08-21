const API_BASE_URL = 'https://us-central1-cabana-ifood.cloudfunctions.net';

async function fazerRequisicaoAPI(endpoint, metodo = 'GET', corpo = null) {
    try {
        const opcoes = {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (corpo) {
            opcoes.body = JSON.stringify(corpo);
        }

        console.log(`Fazendo requisição para ${API_BASE_URL}/proxyRequest${endpoint}`, opcoes);
        const resposta = await fetch(`${API_BASE_URL}/proxyRequest${endpoint}`, opcoes);
        
        const texto = await resposta.text();
        console.log(`Resposta da API (${resposta.status}):`, texto);

        if (!resposta.ok) {
            throw new Error(`Erro na API: ${resposta.status} ${resposta.statusText}\nResposta: ${texto}`);
        }

        return texto ? JSON.parse(texto) : null;
    } catch (error) {
        console.error(`Erro ao fazer requisição para ${endpoint}:`, error);
        throw error;
    }
}

// ... (outras funções permanecem as mesmas)

export async function confirmarPedido(orderId) {
    try {
        const resultado = await fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/confirm`, 'POST');
        console.log('Pedido confirmado com sucesso:', resultado);
        return resultado;
    } catch (error) {
        console.error('Erro ao confirmar pedido:', error);
        throw error;
    }
}

export async function despacharPedido(orderId) {
    try {
        const resultado = await fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/dispatch`, 'POST');
        console.log('Pedido despachado com sucesso:', resultado);
        return resultado;
    } catch (error) {
        console.error('Erro ao despachar pedido:', error);
        throw error;
    }
}

export async function cancelarPedido(orderId, cancelCodeId) {
    try {
        const resultado = await fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/requestCancellation`, 'POST', { cancellationCode: cancelCodeId });
        console.log('Pedido cancelado com sucesso:', resultado);
        return resultado;
    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        throw error;
    }
}
