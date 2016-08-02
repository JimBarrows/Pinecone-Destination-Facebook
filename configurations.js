'use strict';

export  default {
	development: {
		mongoose: {
			url: 'mongodb://localhost/pinecone'
		},
		rabbitMq: {
			url: 'amqp://localhost',
			queueName: 'facebook'
		},
		facebook: {
			url: 'https://graph.facebook.com/v2.7/'
		}
	},
	production: {
		mongoose: {
			url: 'mongodb://mongo/pinecone'
		},
		rabbitMq: {
			url: 'amqp://rabbitmq',
			queueName: 'facebook'
		},
		facebook: {
			url: 'https://graph.facebook.com/v2.7/'
		}
	}
}