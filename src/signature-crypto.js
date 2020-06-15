const crypto = require('crypto');
const fs = require('fs');

const private_key = fs.readFileSync("certs/ec_private.pem");

/**
 * Gets a signature from the provided message, using our built-in private key
 *
 * @param message the (string) message to sign
 * @return the hex-encoded 128-character / 64-byte signature
 **/
module.exports.getSignature = function(message) {

  return signature_to_rs(sign(message, private_key));
};

/**
 * Signs a message and returns a crypto.Signature (as a hex string)
 *
 * @param message the stringified data to sign
 * @param private_key the encryption key to sign with
 * @return a crypto.Signature (as a hex string)
 **/
function sign(message, private_key) {

  // Create the hash of the message we are signing
  const signer = crypto.createSign('sha256');
  signer.update(message);
  signer.end();
  
  // Sign the hash
  const signature = signer.sign(private_key);

  console.log("Signature:" + signature.toString('hex'));
  
  return signature.toString('hex');
}


/**
 * Converts a crypto.Signature into a 128-char fixed-length hex sig (r+s)
 *
 * @param crypto.Signature (as a hex string)
 * @return a rs_signature 128-byte hex string output
 **/
function signature_to_rs(signature_hex) {

  const signature_bin = Uint8Array.from(Buffer.from(signature_hex, 'hex'));

  // Sanity check the signature
  if (signature_bin[0] != 0x30) {
    console.error("Error - invalid start byte:" + signature_hex.substr(0,2));
    console.error(signature_hex);
    return -1;
  }
  if (signature_bin[1] != ((signature_hex.length - 4)>>1)) {
    console.error("Error - invalid signature length:" + signature_bin[1]);
    console.error(signature_hex);
    return -2;
  }
  // Generate r+s from the signature
  const r_start = 2;
  const r_length = signature_bin[r_start + 1];
  const r_padded = (signature_bin[r_start + 2] == 0);
  const r = signature_hex.substr((r_start + 2 + (r_padded ? 1 : 0))*2, (r_length + (r_padded ? -1 : 0))*2);

  const s_start = r_start + r_length + 2;
  const s_length = signature_bin[s_start + 1];
  const s_padded = (signature_bin[s_start + 2] == 0);
  const s = signature_hex.substr((s_start + 2 + (s_padded ? 1 : 0))*2, (s_length + (s_padded ? -1 : 0))*2);

  // Return the 128-byte version of the signature
  const rs_signature = (r.length == 62 ? "00" : "") + r + (s.length == 62 ? "00" : "") + s;
  return rs_signature;
}


/**
 * Converts a 128-char fixed-length hex sig (r+s) into a usable crypto.Signature
 *
 * @param rs_signature 128-byte hex string output
 * @return a crypto.Signature (as a hex string)
 **/
function rs_to_signature(rs_signature) {

  const compact = Uint8Array.from(Buffer.from(rs_signature, 'hex'));
  const sig_buffer = Buffer.from(compact).toString('hex');
  var sig_rebuilt = "30";
  var r_rebuilt = (compact[0] == 0) ? sig_buffer.substr(2, 62) : sig_buffer.substr(0,64);
  if (compact[0] & 0x80)
    r_rebuilt = "00" + r_rebuilt;
  var s_rebuilt = (compact[32] == 0) ? sig_buffer.substr(66, 62) : sig_buffer.substr(64,64);
  if (compact[32] & 0x80)
    s_rebuilt = "00" + s_rebuilt;
  sig_rebuilt += new Number((r_rebuilt.length + s_rebuilt.length + 8)/2).toString(16).padStart(2, '0');
  sig_rebuilt += "02";
  sig_rebuilt += new Number(r_rebuilt.length / 2).toString(16).padStart(2, '0');
  sig_rebuilt += r_rebuilt;
  sig_rebuilt += "02";
  sig_rebuilt += new Number(s_rebuilt.length / 2).toString(16).padStart(2, '0');
  sig_rebuilt += s_rebuilt;

  return sig_rebuilt;
}


/**
 * Verifies a message against a provided signature
 *
 * @param message the stringified data to sign
 * @param public_key the encryption key to verify with
 * @param signature the signature to verify the message against
 * @return true if the signature matches the message, false otherwise
 **/
function verify(message, public_key, signature) {

  const verifier = crypto.createVerify('sha256');
  verifier.update(message);
  verifier.end();

  return verifier.verify(public_key, signature, 'hex');
}
