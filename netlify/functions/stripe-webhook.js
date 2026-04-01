const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      endpointSecret
    );

    console.log('Webhook received:', stripeEvent.type);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, type: stripeEvent.type }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};
