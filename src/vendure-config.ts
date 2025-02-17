import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import {
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  VendureConfig,
  defaultPromotionConditions,
  defaultOrderProcess,
  dummyPaymentHandler,
} from "@vendure/core";
import { EmailPlugin, defaultEmailHandlers } from "@vendure/email-plugin";
import "dotenv/config";
import path from "path";
import { orderCanceledNotificationProcess } from "./customOrderProcess/order-canceled-notification-process";
import { productDeliveredNotificationProcess } from "./customOrderProcess/product-delivered-notification-process";
import { CancelOrderPlugin } from "./plugins/cancelOrderPlugin";
import { CheckUniquePhonePlugin } from "./plugins/checkUniquePhonePlugin";
import { CustomEventPlugin } from "./plugins/customEventPlugin";
import { CustomTokenPlugin } from "./plugins/customTokenPlugin";
import { CollectionIsPrivatePlugin } from "./plugins/collectionIsPrivate";
import { PromotionPlugin } from "./plugins/promotionPlugin";
import { shouldApplyCouponcode } from "./customPromotionConditions/shouldApply";
import { ChannelPlugin } from "./plugins/channelPlugin";
import { AutoAssignCustomerPlugin } from "./plugins/auto-assign-customer.plugin";

const IS_DEV = process.env.APP_ENV === "dev";

export const config: VendureConfig = {
  apiOptions: {
    port: 3000,
    adminApiPath: "admin-api",
    shopApiPath: "shop-api",
    // The following options are useful in development mode,
    // but are best turned off for production for security
    // reasons.
    ...(IS_DEV
      ? {
          adminApiPlayground: {
            settings: { "request.credentials": "include" } as any,
          },
          adminApiDebug: true,
          shopApiPlayground: {
            settings: { "request.credentials": "include" } as any,
          },
          shopApiDebug: true,
        }
      : {}),
  },
  authOptions: {
    tokenMethod: ["bearer", "cookie"],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME,
      password: process.env.SUPERADMIN_PASSWORD,
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET,
    },
    requireVerification: false,
  },
  dbConnectionOptions: {
    type: "mysql",
    // See the README.md "Migrations" section for an explanation of
    // the `synchronize` and `migrations` options.
    synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*.+(js|ts)")],
    logging: false,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  // When adding or altering custom field definitions, the database will
  // need to be updated. See the "Migrations" section in README.md.
  customFields: {},
  promotionOptions: {
    promotionConditions: [
      ...defaultPromotionConditions,
      shouldApplyCouponcode
    ],
  },
  plugins: [
    AssetServerPlugin.init({
      route: "assets",
      assetUploadDir: path.join(__dirname, "../static/assets"),
      // For local dev, the correct value for assetUrlPrefix should
      // be guessed correctly, but for production it will usually need
      // to be set manually to match your production url.
      assetUrlPrefix: IS_DEV ? undefined : "https://www.my-shop.com/assets",
    }),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    EmailPlugin.init({
      devMode: true,
      outputPath: path.join(__dirname, "../static/email/test-emails"),
      route: "mailbox",
      handlers: defaultEmailHandlers,
      templatePath: path.join(__dirname, "../static/email/templates"),
      globalTemplateVars: {
        // The following variables will change depending on your storefront implementation.
        // Here we are assuming a storefront running at http://localhost:8080.
        fromAddress: '"example" <noreply@example.com>',
        verifyEmailAddressUrl: "http://localhost:8080/verify",
        passwordResetUrl: "http://localhost:8080/password-reset",
        changeEmailAddressUrl:
          "http://localhost:8080/verify-email-address-change",
      },
    }),
    ChannelPlugin,
    CheckUniquePhonePlugin,
    PromotionPlugin,
    CancelOrderPlugin,
    CustomEventPlugin,
    CustomTokenPlugin,
    CollectionIsPrivatePlugin,
    AutoAssignCustomerPlugin,
    AdminUiPlugin.init({
      port: 3000,
      route: "admin",
    }),
  ],
  orderOptions: {
    process: [
      defaultOrderProcess,
      productDeliveredNotificationProcess,
      orderCanceledNotificationProcess,
    ],
  },
};