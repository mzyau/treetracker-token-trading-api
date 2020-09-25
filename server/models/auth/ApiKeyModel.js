const FS = require('fs');
const log = require("loglevel");
const path = require("path");
const HttpError = require("../../utils/HttpError");
const ApiKeyRepository = require("../../repositories/ApiKeyRepository");
log.setLevel("debug");

// PRIVATE and PUBLIC key
console.warn("__dirname:", __dirname);
const privateKEY = FS.readFileSync(path.resolve(__dirname, '../../../config/jwtRS256.key'), 'utf8');
const publicKEY = FS.readFileSync(path.resolve(__dirname, '../../../config/jwtRS256.key.pub'), 'utf8');

const authController = {};
authController.apiKey = async (req, res, next) => {
  if (!req.headers['treetracker-api-key']) {
    console.log('ERROR: Invalid access - no API key');
    next({
      log: 'Invalid access - no API key',
      status: 401,
      message: { err: 'Invalid access - no API key' },
    });
  }
  const apiKey = req.headers['treetracker-api-key'];
  const query = {
    text: `SELECT *
    FROM api_key
    WHERE key = $1
    AND tree_token_api_access`,
    values: [apiKey],
  };
  const rval = await pool.query(query);

  if (rval.rows.length === 0) {
    console.log('ERROR: Authentication, Invalid access');
    next({
      log: 'Invalid API access',
      status: 401,
      message: { err: 'Invalid API access' },
    });
  }
  // console.log('Valid Access');
  next();
};

class ApiKeyModel{
  constructor(){
    this.apiKeyRepository = new ApiKeyRepository();
  }

  async check(apiKey){
    if (!apiKey) {
      log.log('ERROR: Invalid access - no API key');
      throw new HttpError(401,'Invalid access - no API key');
    }
    try{
      const result = await this.apiKeyRepository.getByApiKey(apiKey);
    }catch(e){
      if(e.code === 404){
        throw new HttpError(401,'Invalid API access');
      }else{
        throw e;
      }
    }
  }
}

module.exports = ApiKeyModel;
