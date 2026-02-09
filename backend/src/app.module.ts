import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { FooterModule } from './footer/footer.module';
import { NavigationModule } from './navigation/navigation.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FormsModule } from './forms/forms.module';
import { HomeSectionsModule } from './home-sections/home-sections.module';
import { ContactFormModule } from './contact-form/contact-form.module';

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
    NavigationModule,
    ReviewsModule,
    FormsModule,
    HomeSectionsModule,
    ContactFormModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
