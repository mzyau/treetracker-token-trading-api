const request = require("supertest");
const express = require("express");
const tokenRouter = require("./tokenRouter");
const {expect} = require("chai");
const {errorHandler} = require("./utils");
const sinon = require("sinon");
const ApiKeyService = require("../services/ApiKeyService");
const bodyParser = require('body-parser');
const WalletService = require("../services/WalletService");
const JWTService = require("../services/JWTService");
const HttpError = require("../utils/HttpError");
const Token = require("../models/Token");
const TokenService = require("../services/TokenService");
const Wallet = require("../models/Wallet");
const Transfer = require("../models/Transfer");
const TransferService = require("../services/TransferService");

describe("tokenRouter", () => {
  let app;
  const walletLogin = {
    id: 1,
  }

  beforeEach(() => {
    sinon.stub(ApiKeyService.prototype, "check");
    sinon.stub(JWTService.prototype, "verify").returns({
      id: walletLogin.id,
    });
    app = express();
    app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
    app.use(bodyParser.json()); // parse application/json
    app.use(tokenRouter);
    app.use(errorHandler);
  })

  afterEach(() => {
    sinon.restore();
  })

  describe("get tokens, GET /", () => {

    it("limit parameters missed", async () => {
      const res = await request(app)
        .get("/");
      expect(res).property("statusCode").eq(422);
    });

    it("successfully, default wallet", async () => {
      const token = new Token({
        id: 1,
        token: "test-uuid",
        entity_id: 1,
        tree_id: 1,
      });
      const token2 = new Token({
        id: 2,
        token: "test-uuid2",
        entity_id: 2,
        tree_id: 2,
      });
      const wallet = new Wallet(1);
      sinon.stub(TokenService.prototype, "getByOwner").resolves([token, token2]);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      const res = await request(app)
        .get("/?limit=10&start=2");
      expect(res).property("statusCode").eq(200);
      expect(res.body.tokens).lengthOf(1);
      expect(res.body.tokens[0]).property("token").eq("test-uuid2");
      expect(res.body.tokens[0]).property("links").property("capture").eq("/capture/2");
      expect(res.body.tokens[0]).property("links").property("tree").eq("/capture/2/tree");
    });

    it("successfully, sub wallet", async () => {
      const token = new Token({
        id: 1,
        token: "test-uuid",
        entity_id: 1,
        tree_id: 1,
      });
      const wallet = new Wallet(1);
      const wallet2 = new Wallet(2);
      sinon.stub(TokenService.prototype, "getByOwner").resolves([token]);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      sinon.stub(WalletService.prototype, "getByName").resolves(wallet2);
      sinon.stub(Wallet.prototype, "hasControlOver").resolves(true);
      const res = await request(app)
        .get("/?limit=10&wallet=B");
      expect(res).property("statusCode").eq(200);
      expect(res.body.tokens[0]).property("token").eq("test-uuid");
      expect(res.body.tokens[0]).property("links").property("capture").eq("/capture/1");
      expect(res.body.tokens[0]).property("links").property("tree").eq("/capture/1/tree");
    });

    it("sub wallet, no permission", async () => {
      const token = new Token({
        id: 1,
        token: "test-uuid",
        entity_id: 1,
        tree_id: 1,
      });
      const wallet = new Wallet(1);
      const wallet2 = new Wallet(2);
      sinon.stub(TokenService.prototype, "getByOwner").resolves([token]);
      sinon.stub(WalletService.prototype, "getById").resolves(wallet);
      sinon.stub(WalletService.prototype, "getByName").resolves(wallet2);
      sinon.stub(Wallet.prototype, "hasControlOver").resolves(false);
      const res = await request(app)
        .get("/?limit=10&wallet=B");
      expect(res).property("statusCode").eq(403);
    });
  });

  it("/test-uuid successfully", async () => {
    const token = new Token({
      id: 1,
      token: "test-uuid",
      entity_id: 1,
      tree_id: 1,
    });
    const wallet = new Wallet(1);
    sinon.stub(TokenService.prototype, "getByUUID").resolves(token);
    sinon.stub(WalletService.prototype, "getById").resolves(wallet);
    sinon.stub(Wallet.prototype, "getSubWallets").resolves([]);
    sinon.stub(TokenService.prototype, "convertToResponse").resolves({
      token: "xxx",
      sender_wallet: "test",
      receiver_wallet: "test",
    });
    const res = await request(app)
      .get("/test-uuid");
    expect(res).property("statusCode").eq(200);
    expect(res.body).property("token").eq("test-uuid");
    expect(res.body).property("links").property("capture").eq("/capture/1");
    expect(res.body).property("links").property("tree").eq("/capture/1/tree");
  });

  it("/xxx/transactions successfully", async () => {
    const token = new Token(1);
    const wallet = new Wallet(1);
    sinon.stub(TokenService.prototype, "getByUUID").resolves(token);
    sinon.stub(token, "toJSON").resolves({
      entity_id: 1,
    });
    sinon.stub(token, "getTransactions").resolves([{
      id: 1,
    }]);
    sinon.stub(WalletService.prototype, "getById").resolves(wallet);
    sinon.stub(TokenService.prototype, "convertToResponse").resolves({
      token: "xxx",
      sender_wallet: "test",
      receiver_wallet: "test",
    });
    sinon.stub(Wallet.prototype, "getSubWallets").resolves([]);
    const res = await request(app)
      .get("/xxxx/transactions/?limit=1");
    expect(res).property("statusCode").eq(200);
    expect(res.body.history).lengthOf(1);
    expect(res.body.history[0]).property("token").eq("xxx");
    expect(res.body.history[0]).property("sender_wallet").eq("test");
    expect(res.body.history[0]).property("receiver_wallet").eq("test");
  });

  it("/tokens/{token_uuid}/transactions: limit parameters missed", async () => {
    const res = await request(app)
      .get("/xxxx/transactions");
    expect(res).property("statusCode").eq(422);
  });

  it("/xxx/transactions limit and offset successfully", async () => {
    const token = new Token(1);
    const wallet = new Wallet(1);
    sinon.stub(TokenService.prototype, "getByUUID").resolves(token);
    sinon.stub(token, "toJSON").resolves({
      entity_id: 1,
    });
    sinon.stub(token, "getTransactions").resolves([
      {id: 1,}, {id: 2,}, {id: 3,}, {id: 4,}, {id: 5,}, {id: 6,}, {id: 7,}, {id: 8,}, {id: 9,}, {id: 10,}
  ]);
    sinon.stub(WalletService.prototype, "getById").resolves(wallet);
    sinon.stub(TokenService.prototype, "convertToResponse").resolves({
      token: "xxx",
      sender_wallet: "test",
      receiver_wallet: "test",
    }).onCall(4).resolves({
      token: "xxx",
      sender_wallet: "number5",
      receiver_wallet: "number5",
    }).onCall(5).resolves({
      token: "xxx",
      sender_wallet: "number6",
      receiver_wallet: "number6",
    }).onCall(6).resolves({
      token: "xxx",
      sender_wallet: "number7",
      receiver_wallet: "number7",
    });
    sinon.stub(Wallet.prototype, "getSubWallets").resolves([]);
    const res = await request(app)
      .get("/xxxx/transactions?limit=3&start=5");
    expect(res).property("statusCode").eq(200);
    expect(res.body.history).lengthOf(3);
    expect(res.body.history[0]).property("sender_wallet").eq("number5");
    expect(res.body.history[0]).property("receiver_wallet").eq("number5");

    expect(res.body.history[1]).property("sender_wallet").eq("number6");
    expect(res.body.history[1]).property("receiver_wallet").eq("number6");

    expect(res.body.history[2]).property("sender_wallet").eq("number7");
    expect(res.body.history[2]).property("receiver_wallet").eq("number7");


  });

});
