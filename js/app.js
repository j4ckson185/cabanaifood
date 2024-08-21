import { polling, acknowledgeEventos, obterDetalhesPedido, confirmarPedido, despacharPedido, obterMotivoCancelamento, cancelarPedido } from './api.js';

const pedidosProcessados = new Set();

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
    // ... (o código da função exibirPedido permanece o mesmo)
}

function atualizarExibicaoPedidos() {
    // ... (o código da função atualizarExibicaoPedidos permanece o mesmo)
}

function traduzirStatus(status) {
    // ... (o código da função traduzirStatus permanece o mesmo)
}

function traduzirMetodoPagamento(metodo) {
    // ... (o código da função traduzirMetodoPagamento permanece o mesmo)
}

window.confirmarPedidoManual = async function(orderId) {
    try {
        const resultado = await confirmarPedido(orderId);
        console.log('Resultado da confirmação:', resultado);
        if (resultado && resultado.fullCode) {
            atualizarStatusPedido(orderId, resultado.fullCode);
            alert('Pedido confirmado com sucesso!');
        } else {
            atualizarStatusPedido(orderId, 'CONFIRMED');
            alert('Pedido confirmado com sucesso, mas o status pode não estar atualizado.');
        }
    } catch (error) {
        console.error('Erro ao confirmar pedido:', error);
        alert(`Erro ao confirmar pedido: ${error.message}`);
    }
}

window.despacharPedidoManual = async function(orderId) {
    try {
        const resultado = await despacharPedido(orderId);
        console.log('Resultado do despacho:', resultado);
        if (resultado && resultado.fullCode) {
            atualizarStatusPedido(orderId, resultado.fullCode);
            alert('Pedido despachado com sucesso!');
        } else {
            atualizarStatusPedido(orderId, 'DISPATCHED');
            alert('Pedido despachado com sucesso, mas o status pode não estar atualizado.');
        }
    } catch (error) {
        console.error('Erro ao despachar pedido:', error);
        alert(`Erro ao despachar pedido: ${error.message}`);
    }
}

window.mostrarMotivoCancelamento = async function(orderId) {
    try {
        let motivos = await obterMotivoCancelamento(orderId);
        console.log('Motivos de cancelamento:', motivos);
        
        if (!motivos || motivos.length === 0) {
            console.warn('Nenhum motivo de cancelamento retornado pela API. Usando motivos padrão.');
            motivos = [
                { code: 'CLIENTE_DESISTIU', description: 'Cliente desistiu do pedido' },
                { code: 'ITEM_INDISPONIVEL', description: 'Item indisponível' },
                { code: 'ESTABELECIMENTO_FECHADO', description: 'Estabelecimento fechado' }
            ];
        }

        const motivoSelecionado = await selecionarMotivoCancelamento(motivos);
        
        if (motivoSelecionado) {
            const resultado = await cancelarPedido(orderId, motivoSelecionado);
            console.log('Resultado do cancelamento:', resultado);
            if (resultado && resultado.fullCode) {
                atualizarStatusPedido(orderId, resultado.fullCode);
                alert('Pedido cancelado com sucesso!');
            } else {
                atualizarStatusPedido(orderId, 'CANCELLED');
                alert('Pedido cancelado com sucesso, mas o status pode não estar atualizado.');
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
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Selecione o motivo do cancelamento</h2>
                <select id="motivoCancelamento">
                    ${motivos.map(motivo => `<option value="${motivo.code}">${motivo.description}</option>`).join('')}
                </select>
                <button id="confirmarCancelamento">Confirmar</button>
                <button id="cancelarCancelamento">Cancelar</button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmarCancelamento').addEventListener('click', () => {
            const motivoSelecionado = document.getElementById('motivoCancelamento').value;
            document.body.removeChild(modal);
            resolve(motivoSelecionado);
        });

        document.getElementById('cancelarCancelamento').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });
    });
}

function atualizarStatusPedido(orderId, novoStatus) {
    const pedidoElement = document.querySelector(`[data-order-id="${orderId}"]`);
    if (pedidoElement) {
        const statusElement = pedidoElement.querySelector('p:first-of-type span');
        statusElement.textContent = traduzirStatus(novoStatus);
        statusElement.className = `status-${novoStatus.toLowerCase()}`;
        atualizarExibicaoPedidos();
    }
}

inicializarApp();
