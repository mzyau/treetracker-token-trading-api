const express = require('express');
const trustRouter = express.Router();
const { check, validationResult } = require('express-validator');
const assert = require("assert");
const WalletService = require("../services/WalletService");
const TrustService = require("../services/TrustService");
const Wallet = require("../models/Wallet");
const helper = require("./utils");
const Session = require("../models/Session");
const TrustRelationship = require("../models/TrustRelationship");
const Joi = require("joi");

trustRouter.get('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    Joi.assert(
      req.query,
      Joi.object({
        state: Joi.string(),
        type: Joi.string(),
        request_type: Joi.string(),
        start: Joi.number(),
        limit: Joi.number().min(1).max(10000).integer(),
      })
    )
    Joi.assert(
      res.locals,
      Joi.object({
        wallet_id: Joi.string().required()
      })
    )
    const {state, type, request_type, limit, start} = req.query;
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
    const wallet = await walletService.getById(res.locals.wallet_id);
    const trust_relationships = await wallet.getTrustRelationships(
      req.query.state,
      req.query.type,
      req.query.request_type,
    );
    const subWallets = await wallet.getSubWallets();
    for(const sw of subWallets){
      const trustRelationships = await sw.getTrustRelationships(
        req.query.state,
        req.query.type,
        req.query.request_type,
      );
      for(tr of trustRelationships){
        if(trust_relationships.every(e => e.id !== tr.id)){
          trust_relationships.push(tr);
        }
      }
    }
    console.log('here')
    console.log(trust_relationships.length)
    let trust_relationships_json = [];
    for(let t of trust_relationships){
      const j = await trustService.convertToResponse(t);
      trust_relationships_json.push(j);
    }
    console.log(trust_relationships_json)

    //filter trust_relationships json by query
    let numStart = parseInt(start);
    let numLimit = parseInt(limit);
    let numBegin = numStart?numStart-1:0;
    let numEnd = numBegin+numLimit;
    if(numBegin && numEnd){
      trust_relationships_json = trust_relationships_json.slice(numBegin, numEnd);
    }

    res.status(200).json({
      trust_relationships: trust_relationships_json,
    });
  }),
);

trustRouter.post('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.body,
      Joi.object({
        trust_request_type: Joi.string().required().valid(...Object.keys(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE)),
        requestee_wallet: Joi.string().required(),
      })
    );
    Joi.assert(
      res.locals,
      Joi.object({
        wallet_id: Joi.string().required()
      })
    )
    
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
    const wallet = await walletService.getById(res.locals.wallet_id);
    const requesteeWallet = await walletService.getByName(req.body.requestee_wallet);
    let requesterWallet = wallet;
    if(req.body.requester_wallet){
      requesterWallet = await walletService.getByName(req.body.requester_wallet);
    }
    console.log(wallet)
    const trust_relationship = await wallet.requestTrustFromAWallet(
      req.body.trust_request_type,
      requesterWallet,
      requesteeWallet,
    );
    const trust_relationship_json = await trustService.convertToResponse(trust_relationship);
    res.status(200).json(trust_relationship_json);
  })
);

trustRouter.post('/:trustRelationshipId/accept',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      res.locals,
      Joi.object({
        wallet_id: Joi.string().required()
      })
    )
    Joi.assert(
      req.params,
      Joi.object({
        trustRelationshipId: Joi.string().required()
      })
    )
    const trustRelationshipId = req.params.trustRelationshipId;
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
    console.log('MM' + res.locals.wallet_id)
    const wallet = await walletService.getById(res.locals.wallet_id);
    console.log('MM' + wallet.name)
    console.log('MM' + trustRelationshipId)
    const json = await wallet.acceptTrustRequestSentToMe(trustRelationshipId);
    const json2 = await trustService.convertToResponse(json);
    res.status(200).json(json2);
  })
);

trustRouter.post('/:trustRelationshipId/decline',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      res.locals,
      Joi.object({
        wallet_id: Joi.string().required()
      })
    )
    Joi.assert(
      req.params,
      Joi.object({
        trustRelationshipId: Joi.string().required()
      })
    )
    const trustRelationshipId = req.params.trustRelationshipId;
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
    const wallet = await walletService.getById(res.locals.wallet_id);
    const json = await wallet.declineTrustRequestSentToMe(trustRelationshipId);
    const json2 = await trustService.convertToResponse(json);
    res.status(200).json(json2);
  })
);

trustRouter.delete('/:trustRelationshipId',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      res.locals,
      Joi.object({
        wallet_id: Joi.string().required()
      })
    )
    Joi.assert(
      req.params,
      Joi.object({
        trustRelationshipId: Joi.string().required()
      })
    )
    const trustRelationshipId = req.params.trustRelationshipId;
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
    const wallet = await walletService.getById(res.locals.wallet_id);
    const json = await wallet.cancelTrustRequestSentToMe(trustRelationshipId);
    const json2 = await trustService.convertToResponse(json);
    res.status(200).json(json2);
  })
);

module.exports = trustRouter;
