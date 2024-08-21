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
    const pedidosContainer = document.getElementById('pedidos-container');
    let pedidoElement = document.querySelector(`[data-order-id="${pedido.id}"]`);
    
    if (!pedidoElement) {
        pedidoElement = document.createElement('div');
        pedidoElement.className = 'pedido';
        pedidoElement.setAttribute('data-order-id', pedido.id);
        pedidosContainer.appendChild(pedidoElement);
    }
    
    const status = pedido.fullCode || pedido.status || 'N/A';
    
    pedidoElement.innerHTML = `
        <h3>Pedido #${pedido.displayId || pedido.id}</h3>
        <p>Status: <span class="status-${status.toLowerCase()}">${traduzirStatus(status)}</span></p>
        <p>Cliente: ${pedido.customer?.name || 'N/A'}</p>
        <p>Tipo: ${pedido.orderType || 'N/A'}</p>
        <p>Momento: ${pedido.orderTiming || 'N/A'}</p>
        <p>Loja: ${pedido.merchant?.name || 'N/A'}</p>
        
        <div class="pedido-details">
            <h4>Itens do Pedido:</h4>
            <ul class="pedido-items">
                ${(pedido.items || []).map(item => `
                    <li>
                        ${item.quantity}x ${item.name} - R$ ${item.totalPrice.toFixed(2)}
                        ${item.options ? `
                            <ul>
                                ${item.options.map(option => `
                                    <li>${option.quantity}x ${option.name} - R$ ${option.price.toFixed(2)}</li>
                                `).join('')}
                            </ul>
                        ` : ''}
                    </li>
                `).join('')}
            </ul>
            
            <div class="pedido-total">
                <p>Subtotal: R$ ${pedido.total?.subTotal.toFixed(2) || 'N/A'}</p>
                <p>Taxa de Entrega: R$ ${pedido.total?.deliveryFee.toFixed(2) || 'N/A'}</p>
                <p>Taxas Adicionais: R$ ${pedido.total?.additionalFees.toFixed(2) || 'N/A'}</p>
                <p>Benefícios: R$ ${pedido.total?.benefits.toFixed(2) || 'N/A'}</p>
                <p>Total do Pedido: R$ ${pedido.total?.orderAmount.toFixed(2) || 'N/A'}</p>
            </div>
            
            <div class="pedido-payment">
                <h4>Pagamento:</h4>
                <p>Pré-pago: R$ ${pedido.payments?.prepaid.toFixed(2) || 'N/A'}</p>
                <p>Pendente: R$ ${pedido.payments?.pending.toFixed(2) || 'N/A'}</p>
                ${(pedido.payments?.methods || []).map(method => `
                    <p>${traduzirMetodoPagamento(method.method)}: R$ ${method.value.toFixed(2)}</p>
                `).join('')}
            </div>
            
            <div class="pedido-delivery">
                <h4>Entrega:</h4>
                <p>Modo: ${pedido.delivery?.mode || 'N/A'}</p>
                <p>Data/Hora: ${pedido.delivery?.deliveryDateTime || 'N/A'}</p>
                <p>Observações: ${pedido.delivery?.observations || 'N/A'}</p>
                <p>Endereço: ${pedido.delivery?.deliveryAddress?.formattedAddress || 'N/A'}</p>
                <p>Bairro: ${pedido.delivery?.deliveryAddress?.neighborhood || 'N/A'}</p>
                <p>Complemento: ${pedido.delivery?.deliveryAddress?.complement || 'N/A'}</p>
            </div>
            
            ${pedido.benefits ? `
                <div class="pedido-benefits">
                    <h4>Benefícios:</h4>
                    ${pedido.benefits.map(benefit => `
                        <p>${benefit.target}: R$ ${benefit.value.toFixed(2)}</p>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="pedido-actions">
            ${status !== 'DISPATCHED' && status !== 'CONCLUDED' && status !== 'CANCELLED' ? `
                <button class="btn btn-confirm" onclick="confirmarPedidoManual('${pedido.id}')">Confirmar</button>
                <button class="btn btn-dispatch" onclick="despacharPedidoManual('${pedido.id}')">Despachar</button>
            ` : ''}
            ${status !== 'CONCLUDED' && status !== 'CANCELLED' ? `
                <button class="btn btn-cancel" onclick="mostrarMotivoCancelamento('${pedido.id}')">Cancelar</button>
            ` : ''}
        </div>
    `;
    
    atualizarExibicaoPedidos();
}

function atualizarExibicaoPedidos() {
    const tabAtiva = document.querySelector('.tab.active').dataset.tab;
    const pedidos = document.querySelectorAll('.pedido');
    
    pedidos.forEach(pedido => {
        const statusElement = pedido.querySelector('.status-placed, .status-confirmed, .status-dispatched, .status-concluded, .status-cancelled');
        if (statusElement) {
            const status = statusElement.textContent;
            
            if (tabAtiva === 'preparacao' && (status === 'Recebido' || status === 'Confirmado')) {
                pedido.style.display = 'block';
            } else if (tabAtiva === 'enviados' && status === 'Despachado') {
                pedido.style.display = 'block';
            } else if (tabAtiva === 'concluidos' && status === 'Concluído') {
                pedido.style.display = 'block';
            } else if (tabAtiva === 'cancelados' && status === 'Cancelado') {
                pedido.style.display = 'block';
            } else {
                pedido.style.display = 'none';
            }
        }
    });
}

function traduzirStatus(status) {
    const traducoes = {
        'PLACED': 'Recebido',
        'CONFIRMED': 'Confirmado',
        'DISPATCHED': 'Despachado',
        'CONCLUDED': 'Concluído',
        'CANCELLED': 'Cancelado'
    };
    return traducoes[status] || status;
}

function traduzirMetodoPagamento(metodo) {
    const traducoes = {
        'CREDIT': 'Cartão de Crédito',
        'DEBIT': 'Cartão de Débito',
        'MEAL_VOUCHER': 'Vale Refeição',
        'FOOD_VOUCHER': 'Vale Alimentação',
        'DIGITAL_WALLET': 'Carteira Digital',
        'PIX': 'PIX',
        'CASH': 'Dinheiro',
        'OTHER': 'Outro'
    };
    return traducoes[metodo] || metodo;
}

window.confirmarPedidoManual = async function(orderId) {
    try {
        const resultado = await confirmarPedido(orderId);
        console.log('Resultado da confirmação:', resultado);
        if (resultado && resultado.fullCode) {
            atualizarStatusPedido(orderId, resultado.fullCode);
            alert('Pedido confirmado com sucesso!');
        } else {
            throw new Error('Resposta inválida da API');
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
            throw new Error('Resposta inválida da API');
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
        
if (motivoSelecionado) {
            const resultado = await cancelarPedido(orderId, motivoSelecionado);
            console.log('Resultado do cancelamento:', resultado);
            if (resultado && resultado.fullCode) {
                atualizarStatusPedido(orderId, resultado.fullCode);
                alert('Pedido cancelado com sucesso!');
            } else {
                throw new Error('Resposta inválida da API');
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
