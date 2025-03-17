const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: '262196808046-7541r36cagk0cvtvh5916bl4h7vsdc83.apps.googleusercontent.com',        // Replace with your Client ID
    clientSecret: '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', // Replace with your Client Secret
    callbackURL: '/auth/google/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    // Here, profile contains user info (e.g., profile.id, profile.displayName)
    // You could save the user to a database, but for now, we'll pass the profile
    return done(null, profile);
  }
));

// Serialize user to store in session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;