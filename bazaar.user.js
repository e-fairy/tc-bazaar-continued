// ==UserScript==
// @name         TC Bazaar+ v2
// @namespace    namespace
// @version      0.6
// @description  description
// @author       Cute[2068379] (fork) & tos[1976582] (original)
// @match        *.torn.com/bazaar.php*
// @match        *.torn.com/bigalgunshop.php*
// @match        *.torn.com/index.php*
// @match        *.torn.com/shops.php*
// @match        *.torn.com/trade.php*
// @match        *.torn.com/imarket.php*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Put your Torn API key here
const api_key = 'YOUR_API_KEY';

function auto_price(lowest_price) {
    return lowest_price - 1;
}

function lowest_market_price(itemID, type) {
    return torn_api(`market.${itemID}.${type}`)
        .then((r) => {
            //const market_prices = Object.values(r).flat().filter(function (l) {return l != null} )
            const market_prices = Object.values(r).reduce((acc, cur) => acc.concat(cur), []);
            return market_prices.reduce((a, c) => (a < c.cost ? a : c.cost), market_prices[0].cost);
        })
        .catch((err) => console.log(err));
}

const event = new Event('input', { bubbles: true, simulated: true });

document.addEventListener('dblclick', (e) => {
    const location = window.location.pathname + window.location.hash;
    console.log(location, e);
    if (e.target && e.target.tagName && e.target.tagName === 'INPUT') {
        const input = e.target;
        switch (location) {
            case '/bazaar.php#/':
                if (input.className.includes('buyAmountInput')) max_buy(input); //other bazaar buy
                break;
            case '/bazaar.php#/add':
                if (input.className.includes('input-money')) auto_price_add(input, 'bazaar'); //my bazaar add
                else if (input.className === 'clear-all') max_qty(input); //my bazaar qty add
                break;
            case '/bazaar.php#/manage':
                if (input.className.includes('input-money')) auto_price_manage(input, 'bazaar'); //my bazaar manage
                else if (input.className.includes('numberInput')) max_qty_rem(input); //my bazaar qty remove
                break;
            case '/bigalgunshop.php':
            case '/shops.php':
                if (input.name === 'buyAmount[]') buy_hundred(input); //city shop buy 100
                else if (input.id.includes('sell')) city_sell_all(input); //city shop sell all
                else if (input.id.includes('item')) city_sell_all(input); //bigal sell all
                break;
            case '/imarket.php#/p=addl':
                console.log('test');
                if (input.className === 'clear-all') max_qty(input); // item market max qty
                if (input.className.includes('input-money')) auto_price_add(input, 'itemmarket'); // item market price
                break;
            default: //trade qty input
                if (input.id.includes('item')) foriegn_max(input); //foreign buy
                else if (location.includes('trade.php') && input.name && input.name === 'amount') max_qty_trade(input);
                break;
        }
    } else if (e.target && e.target.tagName && e.target.tagName === 'LABEL') {
        if (e.target.className === 'marker-css') {
            const itemID = e.target.closest('LI[data-item]').getAttribute('data-item');
            big_al_check_all(itemID); //big al check/uncheck all
        }
    }
});

//other bazaar buy
function max_buy(input) {
    const max = input
        .closest('DIV[class^=buyMenu]')
        .querySelector('SPAN[class^=amount]')
        .innerText.match(/[0-9]/g)
        .join('');
    let old_value = input.value;
    set_react_input(input, max);
}

//foreign buy
function foriegn_max(input) {
    const i = document.querySelector('div.user-info div.msg').innerText.match(/(\d+).\/.(\d+)/);
    set_regular_input(input, parseInt(i[2]) - parseInt(i[1]));
}

let torn_items = null;
const get_torn_items = () =>
    torn_api('torn..items')
        .then((r) =>
            Object.fromEntries(Object.entries(r.items).map(([itemID, properties]) => [properties.name, itemID]))
        )
        .catch((err) => console.log(err));
//my bazaar add
async function auto_price_add(input, type) {
    if (!torn_items) torn_items = await get_torn_items();
    const itemName = input.closest('LI').querySelector('.t-overflow').innerText;
    const itemID = parseInt(torn_items[itemName]);

    const lowest_price = await lowest_market_price(itemID, type);
    set_regular_input(input, auto_price(lowest_price));
}

//my bazaar manage
async function auto_price_manage(input, type) {
    if (!torn_items) torn_items = await get_torn_items();
    const itemName = input.closest('div[class^=item]').getAttribute('aria-label');
    const itemID = parseInt(torn_items[itemName]);
    const lowest_price = await lowest_market_price(itemID, type);
    set_react_input(input, auto_price(lowest_price));
}

//my bazaar qty add
function max_qty(input) {
    const qty = input
        .closest('LI')
        .querySelector('div.name-wrap')
        .innerText.match(/x(\d+)/);
    set_regular_input(input, qty ? qty[1] : 1);
}

//my bazaar qty remove
function max_qty_rem(input) {
    const qty = input
        .closest('div[class^=row]')
        .querySelector('div[class^=desc]')
        .innerText.match(/x(\d+)/);
    set_react_input(input, qty ? qty[1] : 1);
}

//city shop buy 100
function buy_hundred(input) {
    set_regular_input(input, 100);
}

//city shop sell all
function city_sell_all(input) {
    const qty = input
        .closest('UL')
        .querySelector('LI.desc')
        .innerText.match(/x(\d+)/);
    set_regular_input(input, qty ? qty[1] : 1);
}

//big al check all
function big_al_check_all(item_id) {
    document
        .querySelectorAll(`LI[data-item="${item_id}"] INPUT[type=checkbox]`)
        .forEach((checkbox) => (checkbox.checked = !checkbox.checked));
}

//trade max qty
function max_qty_trade(input) {
    console.log(input.closest('div.title-wrap')); //.querySelector('div.name-wrap'))
}

function set_regular_input(input, newval) {
    input.value = newval;
    input.dispatchEvent(event);
    input.select();
}

function set_react_input(input, newval) {
    let old_value = input.value;
    input.value = newval;
    input._valueTracker.setValue(old_value);
    input.dispatchEvent(event);
    input.select();
}

async function torn_api(args) {
    if (api_key == 'YOUR_API_KEY' || !api_key) return alert('You need to set an API key to use the autoprice script.');

    const a = args.split('.');
    if (a.length !== 3) throw `Bad argument in torn_api(args, key): ${args}`;
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST',
            url: `https://api.torn.com/${a[0]}/${a[1]}?selections=${a[2]}&key=${api_key}`,
            headers: {
                'Content-Type': 'application/json',
            },
            onload: (response) => {
                try {
                    const resjson = JSON.parse(response.responseText);
                    resolve(resjson);
                } catch (err) {
                    reject(err);
                }
            },
            onerror: (err) => {
                reject(err);
            },
        });
    });
}
