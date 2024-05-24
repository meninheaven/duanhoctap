'use strict';
const StockModel = require("../models").Stock;
const axios = require('axios');

async function createStock(stock, like, ip) {
  const newStock = new StockModel({
    symbol: stock,
    likes: like ? [ip] : [],
  });
  const savedNew = await newStock.save();
  return savedNew;
}

async function findStock(stock) {
  return await StockModel.findOne({ symbol: stock }).exec();
}

async function saveStock(stock, like, ip) {
  let saved = {};
  const foundStock = await findStock(stock);
  if (!foundStock) {
    const createsaved = await createStock(stock, like, ip);
    saved = createsaved;
    return saved;
  } else {
    if (like && foundStock.likes.indexOf(ip) === -1) {
      foundStock.likes.push(ip);
    }
    saved = await foundStock.save();
    return saved;
  }
}

async function getStock(stock) {
  try {
    const response = await axios.get(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
    const { symbol, latestPrice } = response.data;
    return { symbol, latestPrice };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
}

module.exports = function (app) {
  app.route("/api/stock-prices").get(async function (req, res) {
    const { stock, like } = req.query;
    if (Array.isArray(stock)) {
      console.log("stocks", stock);
      
      const [stock1, stock2] = await Promise.all([
        getStock(stock[0]),
        getStock(stock[1]),
      ]);

      const [firstStockData, secondStockData] = await Promise.all([
        saveStock(stock[0], like, req.ip),
        saveStock(stock[1], like, req.ip),
      ]);
      
      const stockData = [];

      if (stock1 && stock2) {
        stockData.push({
          stock: stock1.symbol,
          price: stock1.latestPrice,
          rel_likes: firstStockData.likes.length - secondStockData.likes.length,
        }, {
          stock: stock2.symbol,
          price: stock2.latestPrice,
          rel_likes: secondStockData.likes.length - firstStockData.likes.length,
        });
      } else if (stock1) {
        stockData.push({
          stock: stock1.symbol,
          price: stock1.latestPrice,
          rel_likes: firstStockData.likes.length,
        });
      } else if (stock2) {
        stockData.push({
          stock: stock2.symbol,
          price: stock2.latestPrice,
          rel_likes: secondStockData.likes.length,
        });
      }

      res.json({ stockData }); return;
    } else {
      const { symbol, latestPrice } = await getStock(stock);
      if (!symbol) {
        res.json({ stockData: { likes: like ? 1 : 0 } });
        return;
      }
      const oneStockData = await saveStock(symbol, like, req.ip);
      console.log("One Stock Data", oneStockData);

      res.json({
        stockData: {
          stock: symbol,
          price: latestPrice,
          likes: oneStockData.likes.length,
        },
      });
    }
  });
};
