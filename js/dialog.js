/*
 * Class to handle dialog windows to show detail of block or tx
 *
 * Copyright (C) 2019 The Veles Core developers
 * Author: Altcoin Baggins
 *
 * This program is free software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 */
var explorerDialog = {
	ws: null,

	applyLinkEvents: function() {
		$('a[href^="/block/"]').click(function(e) {
			e.preventDefault();
			explorerDialog.blockDetail($(this).attr('href').replace('/block/', ''));
		});
		$('a[href^="/tx/"]').click(function(e) {
			e.preventDefault();
			explorerDialog.txDetail($(this).attr('href').replace('/tx/', ''));
		});
		$('.ws-no-modal').unbind('click');
	},

	blockDetail: function(blockHash) {
		// close tx detail if open, open modal
		this.closeTxDetail();
		$('#block-detail-modal').modal('show');

		this.ws.get_cmd_result('node', 'getblock ' + blockHash + ' 2', {}, function(data) {
			$('#block-detail-modal span.block-hash').text(data.hash);
			$headerRow = $('#block-detail-modal table:eq(0) td');
			$headerRow.eq(0).text(data.height);
			$headerRow.eq(1).text(data.version);
			$headerRow.eq(2).text(Math.round(data.difficulty * 10000) / 10000);
			$headerRow.eq(3).text(data.confirmations);
			$headerRow.eq(4).text(Math.round(data.size / 10) / 100);
			$headerRow.eq(5).text(data.bits);
			$headerRow.eq(6).text(data.nonce);
			$headerRow.eq(7).text(new Date(data.time * 1000).toLocaleString());

			$txTable = $('#block-detail-modal table:eq(1)');
			$txTable.html('');
			var txRecipients, txValue, txOutAddr;

			for (var i = 0; i < data.tx.length; i++) {
				txAddrs = {};
				txValue = 0;

				for (var j = 0; j < data.tx[i].vout.length; j++) {
					try {
						txValue += data.tx[i].vout[j].value;

						if (data.tx[i].vout[j].scriptPubKey.hasOwnProperty('addresses')) {
							for (var k = 0; k < data.tx[i].vout[j].scriptPubKey.addresses.length; k++) {
								txAddrs[data.tx[i].vout[j].scriptPubKey.addresses[k]] = data.tx[i].vout[j].scriptPubKey.addresses[k];
							}
						}
					} catch {
					}
				}
				$txTable.append('<tr><td class="hidden-xs"><a href="/tx/' + data.tx[i].txid + '">' + data.tx[i].txid + '</a></td>'
					+ '<td>' + Object.keys(txAddrs).length + '</td><td>' + ( Math.round(txValue * 100000000) / 100000000 ) + '</td>'
					+ '<td class="view_tx"><a href="/tx/' + data.tx[i].txid + '"><span class="glyphicon glyphicon-eye-open"></span></a></td></tr>');
				explorerDialog.applyLinkEvents();
			}
		});
	},

	closeBlockDetail: function() {
		$('#block-detail-modal').modal('hide');
	},

	txDetail: function(blockHash) {
		this.ws.get_cmd_result('node', 'getrawtransaction ' + blockHash + ' true', {}, function(data) {
			$('#tx-detail-modal').modal('show');
			$('#tx-detail-modal span.tx-hash').text(data.hash);
			$headerRow = $('#tx-detail-modal table:eq(0) td');
			$headerRow.eq(0).text(data.confirmations);
			$headerRow.eq(1).html('<a href="#">' + data.blockhash + '</a>');
			$headerRow.eq(2).text(new Date(data.time * 1000).toLocaleString());
			// populate all links in first table which points to block
			$('#tx-detail-modal table:eq(0) a').attr('href', '/block/' + data.blockhash + '');

			// Input Addresses panel
			$inputTable = $('#tx-detail-modal table:eq(1)');
			$inputTable.html('');

			if (data.vin.length == 1 && data.vin[0].hasOwnProperty('coinbase')) {
				$inputTable.append('<tr style="text-align:center;" class="info"><td>New Coins</td></tr>');
			} else {
				$inputTable.append('<tr style="text-align:center;" class="success"><td><b>' + data.vin.length + '</i> inputs</td></tr>');
				$inputTable.append('<tr style="text-align:center;"><td><a href="/tx/' + data.hash + '" class="ws-no-modal">See addresses in <b>Transaction Details </b> &raquo;</a></td></tr>');
			}

			$outputTable = $('#tx-detail-modal table:eq(2)');
			$outputTable.html('');
			var txRecipients, txValue, txOutAddr;
			var  txAddrs = {};
			testdata = data;

			for (var j = 0; j < data.vout.length; j++) {
				try {
					txValue += data.vout[j].value;

					if (data.vout[j].scriptPubKey.hasOwnProperty('addresses')) {
						for (var k = 0; k < data.vout[j].scriptPubKey.addresses.length; k++) {
							txOutAddr = data.vout[j].scriptPubKey.addresses[k];

							if (txAddrs.hasOwnProperty(txOutAddr))
								txAddrs[txOutAddr] += data.vout[j].value;
							else
								txAddrs[txOutAddr] = data.vout[j].value;
						}
					}
				} catch {
				}
			}
			var rows = 0;
			for (var addr in txAddrs) {	
				rows++;
				if (txAddrs.hasOwnProperty(addr)) {	
					if (rows <= 5) {
						$outputTable.append('<tr><td class="hidden-xs"><a href="/address/' + addr + '">' + addr + '</a></td>'
							+ '<td class="success hidden-xs">' + txAddrs[addr] + '</td></tr>');
					}
				}
			}
			if (rows > 5) {
				$outputTable.append('<tr style="text-align:center;"><td><a href="/tx/' + data.hash + '" class="ws-no-modal"> and ' + (rows - 5)  + ' more, see <b>Transaction Details </b> &raquo;</a></td></tr>');
			}

			explorerDialog.applyLinkEvents();
		});
	},

	closeTxDetail: function() {
		$('#tx-detail-modal').modal('hide');
	},


	init: function(wsClient) {
		this.ws = wsClient;
		this.applyLinkEvents();
	},
}

// Set up the object when page is loaded
$(document).ready(function(){
	explorerDialog.init(velesSocketClient);
	// assign onclick events to newly created links
	$('#recent-table').on('draw.dt', function () {
	    explorerDialog.applyLinkEvents();
	});
});

