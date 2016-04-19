'use strict';

$(document).ready(init);

function init() {
    $('.search-form').submit(searchCompanies);
    $('.search-results').on('click', '.glyphicon', toggleFavorite);
    $('.ticker-results').on('click', '.glyphicon', removeFavorite);
    $('.ticker-results').on('click', '.btn-detail', detailTicker);
    getStockData();
    setInterval(getStockData, 60000);
}

var TickerStorage = {
    get: function() {
        try {
            var tickers = JSON.parse(localStorage.tickers);
        } catch (err) {
            var tickers = [];
        }

        return tickers;
    },
    write: function(tickers) {
        localStorage.tickers = JSON.stringify(tickers);
    }
};

function toggleFavorite() {
    if ($(this).hasClass('glyphicon-star-empty')) {
        $(this).removeClass('glyphicon-star-empty').addClass('glyphicon-star');

        var tickerToSave = $(this).parent().attr('data-ticker');

        var tickers = TickerStorage.get();
        tickers.push(tickerToSave);
        TickerStorage.write(tickers);
    } else {
        $(this).removeClass('glyphicon-star').addClass('glyphicon-star-empty');

        var tickerToRemove = $(this).parent().attr('data-ticker');

        var tickers = TickerStorage.get();
        var index = tickers.indexOf(tickerToRemove);
        tickers.splice(index, 1);
        TickerStorage.write(tickers);
    }

    getStockData();
}

function removeFavorite() {
    var tickerToRemove = $(this).parent().attr('data-ticker');

    var tickers = TickerStorage.get();
    var index = tickers.indexOf(tickerToRemove);
    tickers.splice(index, 1);
    TickerStorage.write(tickers);

    getStockData();
}

function searchCompanies(event) {
    event.preventDefault();

    $('.search-results').empty();

    var searchStr = $('.search-name').val();

    $.ajax({
        url: `http://dev.markitondemand.com/MODApis/Api/v2/Lookup/jsonp?input=${searchStr}&callback=?`,
        dataType: 'jsonp',
        success: function(data) {
            var $searchResults = data.map(generateSearchResultRow);
            $('.search-results').append($searchResults);
            $('.search-name').val('');
        },
        error: function(err) {
            console.error(err);
        }
    });
}

function generateSearchResultRow(dataObj) {
    var $row = $('<tr>');

    var tickers = TickerStorage.get();
    var index = tickers.indexOf(dataObj.Symbol);

    if (index < 0) {
        var $favorite = $('<td>').html('<i class="glyphicon glyphicon-star-empty"></i>');
    } else {
        var $favorite = $('<td>').html('<i class="glyphicon glyphicon-star"></i>');
    }

    $favorite.attr('data-ticker', dataObj.Symbol);

    var $ticker = $('<td>').text(dataObj.Symbol);
    var $name = $('<td>').text(dataObj.Name);
    var $exchange = $('<td>').text(dataObj.Exchange);

    $row.append($favorite, $ticker, $name, $exchange);

    return $row;
}

function getStockData() {
    $('.ticker-results').empty();

    var tickers = TickerStorage.get();

    tickers.forEach(function(ticker) {
        $.ajax({
            url: `http://dev.markitondemand.com/MODApis/Api/v2/Quote/jsonp?symbol=${ticker}&callback=?`,
            dataType: 'jsonp',
            success: function(data) {
                var $tickerResult = generateTickerResultRow(data);
                $('.ticker-results').append($tickerResult);
            },
            error: function(err) {
                console.error(err);
            }
        });
    });

    $('.last-updated').text('Last Updated: ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
}

function generateTickerResultRow(dataObj) {
    var $row = $('<tr>');

    var $ticker = $('<td>').text(dataObj.Symbol);
    var $name = $('<td>').text(dataObj.Name);
    var $lastPrice = $('<td>').text(dataObj.LastPrice);

    if (dataObj.Change > 0) {
        $lastPrice.addClass('green');
    } else if (dataObj.Change < 0) {
        $lastPrice.addClass('red');
    }

    var $dailyHigh = $('<td>').text(dataObj.High);
    var $dailyLow = $('<td>').text(dataObj.Low);
    var $detailBtn = $('<button>').addClass('btn btn-primary btn-xs btn-detail').attr('data-toggle', 'modal').attr('data-target', '#detailModal').attr('data-ticker', dataObj.Symbol).attr('data-company', dataObj.Name).text('Chart');
    var $removeIcon = $('<td>').html('<i class="glyphicon glyphicon-remove"></i>');

    $removeIcon.attr('data-ticker', dataObj.Symbol);

    $row.append($ticker, $name, $lastPrice, $dailyHigh, $dailyLow, $detailBtn, $removeIcon);

    return $row;
}

function detailTicker() {
    var ticker = $(this).attr('data-ticker');
    var company = $(this).attr('data-company');

    $('.modal h4').text(company + ' (' + ticker + ')');

    var parameters = {
        Normalized: false,
        NumberOfDays: 365,
        DataPeriod: 'Day',
        Elements: [
            {
                Symbol: ticker,
                Type: "price",
                Params: ['c']
            }
        ]
    };

    var params = {
        parameters: JSON.stringify(parameters)
    };

    $.ajax({
        url: 'http://dev.markitondemand.com/Api/v2/InteractiveChart/jsonp',
        dataType: 'jsonp',
        data: params,
        success: function(data) {
            var priceData = data.Elements[0].DataSeries.close.values;

            $('.modal-body').highcharts({
                chart: {
                    type: 'line'
                },
                title: {
                    text: 'One Year Price Movement'
                },
                xAxis: {
                    title: {
                        text: 'Time'
                    }
                },
                yAxis: {
                    title: {
                        text: 'Value ($USD)'
                    }
                },
                series: [{
                    name: ticker,
                    data: priceData
                }]
            });
        },
        error: function(err) {
            console.error(err);
        }
    });
}