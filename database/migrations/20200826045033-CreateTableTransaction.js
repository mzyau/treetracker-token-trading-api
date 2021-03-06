'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.createTable('transaction', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    token_id: {
      type: 'int',
      notNull: true,
      // foreignKey: {
      //   name: 'transaction_token_id_fk',
      //   table: 'token',
      //   mapping: {
      //     token_id: 'id'
      //   },
      //   rules: {
      //     onDelete: 'CASCADE',
      //     onUpdate: 'RESTRICT',
      //   },
      // },
    },
    transfer_id: { type: 'int', notNull: true },
    source_entity_id: { type: 'int', notNull: true },
    destination_entity_id: { type: 'int', notNull: true },
    processed_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()')
    },
  })
    // .then(
    //   () => {
    //     db.addForeignKey('transaction', 'token', 'transaction_token_id_fk',
    //       {
    //         'token_id': 'id',
    //       },
    //       {
    //         onDelete: 'CASCADE',
    //         onUpdate: 'RESTRICT',
    //       });
    //   });
};

exports.down = function (db) {
  return db.dropTable('transaction');
};

exports._meta = {
  "version": 1
};
