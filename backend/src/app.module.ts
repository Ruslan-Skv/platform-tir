import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { AdminModule } from './admin/admin.module';
import { AdminAccessModule } from './admin/admin-access/admin-access.module';
import { AdminResourceInterceptor } from './admin/admin-access/admin-resource.interceptor';
import { WishlistModule } from './wishlist/wishlist.module';
import { CompareModule } from './compare/compare.module';
import { CartModule } from './cart/cart.module';
import { SupportChatModule } from './support-chat/support-chat.module';
import { HomeDirectionsModule } from './home-directions/home-directions.module';
import { HeroModule } from './hero/hero.module';
import { AdvantagesModule } from './advantages/advantages.module';
import { HomeServicesModule } from './home-services/home-services.module';
import { FeaturedProductsModule } from './featured-products/featured-products.module';
import { PartnerProductsModule } from './partner-products/partner-products.module';
import { CareersModule } from './careers/careers.module';
import { ContactsModule } from './contacts/contacts.module';
import { FooterModule } from './footer/footer.module';
import { NavigationModule } from './navigation/navigation.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CatalogBlockModule } from './catalog-block/catalog-block.module';
import { CatalogFilterBlocksModule } from './catalog-filter-blocks/catalog-filter-blocks.module';
import { CatalogHubPreviewModule } from './catalog-hub-preview/catalog-hub-preview.module';
import { FormsModule } from './forms/forms.module';
import { QuizModule } from './quiz/quiz.module';
import { HomeSectionsModule } from './home-sections/home-sections.module';
import { ContactFormModule } from './contact-form/contact-form.module';
import { SitePublicModule } from './site-public/site-public.module';
import { SitePlatformFeedbackModule } from './site-platform-feedback/site-platform-feedback.module';
import { SellerLegalModule } from './seller-legal/seller-legal.module';
import { SiteDisclaimerModule } from './site-disclaimer/site-disclaimer.module';
import { PublicOfferModule } from './public-offer/public-offer.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = parseInt(config.get('SMTP_PORT') ?? '1025', 10);
        return {
          transport: {
            host: config.get('SMTP_HOST', 'localhost'),
            port,
            secure: port === 465, // true для SMTPS (465), false для 587/1025 (STARTTLS/MailHog)
            auth:
              config.get('SMTP_USER') && config.get('SMTP_PASS')
                ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') }
                : undefined,
          },
          defaults: { from: config.get('MAIL_FROM', 'noreply@example.com') },
        };
      },
    }),
    DatabaseModule,
    ElasticsearchModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    AdminModule,
    WishlistModule,
    CompareModule,
    CartModule,
    SupportChatModule,
    HomeDirectionsModule,
    HeroModule,
    AdvantagesModule,
    HomeServicesModule,
    FeaturedProductsModule,
    PartnerProductsModule,
    FooterModule,
    CareersModule,
    ContactsModule,
    NavigationModule,
    ReviewsModule,
    CatalogBlockModule,
    CatalogFilterBlocksModule,
    CatalogHubPreviewModule,
    FormsModule,
    QuizModule,
    HomeSectionsModule,
    ContactFormModule,
    SitePublicModule,
    SitePlatformFeedbackModule,
    SellerLegalModule,
    SiteDisclaimerModule,
    PublicOfferModule,
    AdminAccessModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminResourceInterceptor,
    },
  ],
})
export class AppModule {}
