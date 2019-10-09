# oracle-lite
Temporary simple Oracle system for use in testnet

DB Schema
=========
Here is the table definition currently in use:

CREATE TABLE `PricingRecord` (
  `PricingRecordPK` bigint(20) NOT NULL AUTO_INCREMENT,
  `Timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `xAG` bigint(20) NOT NULL DEFAULT 0,
  `xAU` bigint(20) NOT NULL DEFAULT 0,
  `xAUD` bigint(20) NOT NULL DEFAULT 0,
  `xBTC` bigint(20) NOT NULL DEFAULT 0,
  `xCAD` bigint(20) NOT NULL DEFAULT 0,
  `xCHF` bigint(20) NOT NULL DEFAULT 0,
  `xCNY` bigint(20) NOT NULL DEFAULT 0,
  `xEUR` bigint(20) NOT NULL DEFAULT 0,
  `xGBP` bigint(20) NOT NULL DEFAULT 0,
  `xJPY` bigint(20) NOT NULL DEFAULT 0,
  `xNOK` bigint(20) NOT NULL DEFAULT 0,
  `xNZD` bigint(20) NOT NULL DEFAULT 0,
  `xUSD` bigint(20) NOT NULL DEFAULT 0,
  `unused1` bigint(20) NOT NULL DEFAULT 0,
  `unused2` bigint(20) NOT NULL DEFAULT 0,
  `unused3` bigint(20) NOT NULL DEFAULT 0,
  `Signature` char(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`PricingRecordPK`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8
