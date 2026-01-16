const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const callbackURL =
  process.env.NODE_ENV === "production"
    ? process.env.GOOGLE_CALLBACK_URL // Production callback URL
    : process.env.GOOGLE_CALLBACK_URL_LOCAL; // Local callback URL

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL, // Dynamically set callback URL
      scope: ["email", "profile"],
    },
    async function (accessToken, refreshToken, profile, done) {
      done(null, {
        email: profile.emails[0].value,
        fullName: profile.displayName,
        avatar: profile.photos[0].value,
      });
    }
  )
);

module.exports = passport;