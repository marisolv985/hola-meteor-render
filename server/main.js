import { Meteor } from 'meteor/meteor';
const fetch = require('node-fetch');


Meteor.methods({
  async verifyRecaptcha(token) {
    const secretKey = "6Lf11kksAAAAAMKGksRji33cP7KXJ-c-FkgsHdXK";

    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${token}`
      }
    );

    return await response.json();
  }
});
