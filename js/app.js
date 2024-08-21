import { polling, acknowledgeEventos, obterDetalhesPedido, confirmarPedido, despacharPedido, obterMotivoCancelamento, cancelarPedido } from './api.js';

const pedidosProcessados = new Set();
let currentOrders = [];

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    inicializarTabs();
});

async function inicializarApp() {
    try {
        console.log('Inicializando aplicativo...');
        await fazerPolling();
        setInterval(fazerPolling, 30000);
    } catch (error) {
        console.error('Erro ao inicializar o app:', error);
        alert('Erro ao inicializar o aplicativo. Por favor, verifique o console e tente novamente.');
    }
}

function inicializarTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            atualizarExibicaoPedidos();
        });
    });
}

async function fazerPolling() {
    try {
        console.log('Iniciando polling...');
        const eventos = await polling();
        console.log('Eventos recebidos em fazerPolling:', eventos);
        if (eventos === null || !Array.isArray(eventos) || eventos.length === 0) {
            console.log('Nenhum evento novo para processar');
            return;
        }
        await processarEventos(eventos);
        const eventIds = eventos.map(evento => evento.id).filter(id => id);
        if (eventIds.length > 0) {
            try {
                await acknowledgeEventos(eventIds);
                console.log('Eventos reconhecidos com sucesso:', eventIds);
            } catch (ackError) {
                console.error('Erro ao reconhecer eventos:', ackError);
            }
        } else {
            console.log('Nenhum ID de evento válido para reconhecer');
        }
    } catch (error) {
        console.error('Erro ao fazer polling:', error);
    }
}

async function processarEventos(eventos) {
    for (const evento of eventos) {
        if (evento.code && evento.orderId && !pedidosProcessados.has(evento.orderId)) {
            pedidosProcessados.add(evento.orderId);
            await processarPedido(evento);
        }
    }
}

async function processarPedido(evento) {
    try {
        const pedido = await obterDetalhesPedido(evento.orderId);
        exibirPedido(pedido);
    } catch (error) {
        console.error('Erro ao processar pedido:', error);
    }
}

function exibirPedido(pedido) {
    // ... (mantenha a função exibirPedido como está)
}

function atualizarExibicaoPedidos() {
    // ... (mantenha a função atualizarExibicaoPedidos como está)
}

function traduzirStatus(status) {
    // ... (mantenha a função traduzirStatus como está)
}

function traduzirMetodoPagamento(metodo) {
    // ... (mantenha a função traduzirMetodoPagamento como está)
}

window.confirmarPedidoManual = async function(orderId) {
    try {
        const resultado = await confirmarPedido(orderId);
        if (resultado && resultado.fullCode) {
            atualizarStatusPedido(orderId, resultado.fullCode);
            alert('Pedido confirmado com sucesso!');
        } else {
            throw new Error(resultado.message || 'Erro desconhecido ao confirmar pedido');
        }
    } catch (error) {
        console.error('Erro ao confirmar pedido:', error);
        alert(`Erro ao confirmar pedido: ${error.message}`);
    }
}

window.despacharPedidoManual = async function(orderId) {
    try {
        const resultado = await despacharPedido(orderId);
        if (resultado && resultado.fullCode) {
            atualizarStatusPedido(orderId, resultado.fullCode);
            alert('Pedido despachado com sucesso!');
        } else {
            throw new Error(resultado.message || 'Erro desconhecido ao despachar pedido');
        }
    } catch (error) {
        console.error('Erro ao despachar pedido:', error);
        alert(`Erro ao despachar pedido: ${error.message}`);
    }
}

window.mostrarMotivoCancelamento = async function(orderId) {
    try {
        const motivos = await obterMotivoCancelamento(orderId);
        console.log('Motivos de cancelamento:', motivos);
        
        if (!motivos || motivos.length === 0) {
            throw new Error('Nenhum motivo de cancelamento disponível');
        }
        const motivoSelecionado = await selecionarMotivoCancelamento(motivos);
        console.log('Motivo selecionado:', motivoSelecionado);
        
        if (motivoSelecionado) {
            const resultado = await cancelarPedido(orderId, motivoSelecionado);
            if (resultado && resultado.fullCode) {
                atualizarStatusPedido(orderId, resultado.fullCode);
                alert('Pedido cancelado com sucesso!');
            } else {
                throw new Error(resultado.message || 'Erro desconhecido ao cancelar pedido');
            }
        } else {
            alert('Cancelamento abortado pelo usuário.');
        }
    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        alert(`Erro ao cancelar pedido: ${error.message}`);
    }
}

async function selecionarMotivoCancelamento(motivos) {
    // ... (mantenha a função selecionarMotivoCancelamento como está)
}

function atualizarStatusPedido(orderId, novoStatus) {
    const pedidoElement = document.querySelector(`[data-order-id="${orderId}"]`);
    if (pedidoElement) {
        const statusElement = pedidoElement.querySelector('p span');
        if (statusElement) {
            statusElement.textContent = traduzirStatus(novoStatus);
            statusElement.className = `status-${novoStatus.toLowerCase()}`;
            
            // Atualiza o status no objeto do pedido
            const pedidoIndex = currentOrders.findIndex(p => p.id === orderId);
            if (pedidoIndex !== -1) {
                currentOrders[pedidoIndex].status = novoStatus;
            }
            
            atualizarExibicaoPedidos();
        } else {
            console.error('Elemento de status não encontrado para o pedido:', orderId);
        }
    } else {
        console.error('Elemento do pedido não encontrado:', orderId);
    }
}

inicializarApp();
