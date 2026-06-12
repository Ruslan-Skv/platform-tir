'use client';

import type { CartServiceItem } from '@/shared/api/cart';
import type { CartSection as CartSectionData } from '@/views/cart/lib/build-cart-sections';

import { CartComponentItemCard } from './CartComponentItemCard';
import { CartDeliverySection } from './CartDeliverySection';
import { CartOrderServiceGroupCard } from './CartOrderServiceGroupCard';
import styles from './CartPage.module.css';
import { CartProductItemCard } from './CartProductItemCard';
import { CartSectionSummary } from './CartSectionSummary';
import { CartServiceItemCard } from './CartServiceItemCard';
import type { CartPageModel } from './useCartPage';

type CartSectionProps = {
  section: CartSectionData;
  model: CartPageModel;
};

export function CartSection({ section, model }: CartSectionProps) {
  const {
    cartServiceItems,
    updatingItems,
    addToOrderInProgress,
    wantDelivery,
    deliveryForm,
    setDeliveryForm,
    calculatedDelivery,
    deliveryCalculationLoading,
    deliveryCalculationError,
    deliverySettlements,
    deliveryPaymentMode,
    dismissedManagerCommentIds,
    setDismissedManagerCommentIds,
    pendingReviewOrder,
    approvedOrder,
    returnedForCorrectionOrder,
    approvalRemainingMs,
    pendingOrderHasDelivery,
    approvedOrderHasDelivery,
    returnedOrderHasDelivery,
    orderWithDelivery,
    cartItemIdsInOrder,
    cartItemIdsInApprovedOrder,
    cartSections,
    managerCommentByCartItemId,
    canSubmitForReview,
    submitInProgress,
    cancelInProgress,
    canSendToEmail,
    deliveryFormValid,
    handleAddToOrder,
    handleSubmitForReview,
    handleDeliveryCheckboxChange,
    handleCancelReview,
    handleQuantityChange,
    handleComponentQuantityChange,
    handleRemoveItem,
    handleRemoveComponent,
    openSendToEmailModal,
    removeCartServiceItemById,
  } = model;

  const orderIdForSection2 = (pendingReviewOrder ?? returnedForCorrectionOrder)?.id;

  return (
    <div className={styles.cartSection}>
      <h3 className={styles.cartSectionTitle}>{section.title}</h3>
      <div className={styles.cartSectionItems}>
        {section.products.map((item) => (
          <CartProductItemCard
            key={item.id}
            item={item}
            sectionId={section.id}
            isUpdating={updatingItems.has(`item-${item.id}`)}
            managerComment={managerCommentByCartItemId.get(item.id)}
            dismissedManagerCommentIds={dismissedManagerCommentIds}
            setDismissedManagerCommentIds={setDismissedManagerCommentIds}
            cartItemIdsInApprovedOrder={cartItemIdsInApprovedOrder}
            cartItemIdsInOrder={cartItemIdsInOrder}
            pendingReviewOrder={pendingReviewOrder}
            addToOrderInProgress={addToOrderInProgress}
            onAddToOrder={handleAddToOrder}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
          />
        ))}
        {section.components.map((item) => (
          <CartComponentItemCard
            key={item.id}
            item={item}
            sectionId={section.id}
            isUpdating={updatingItems.has(`component-${item.componentId}`)}
            cartItemIdsInApprovedOrder={cartItemIdsInApprovedOrder}
            cartItemIdsInOrder={cartItemIdsInOrder}
            pendingReviewOrder={pendingReviewOrder}
            addToOrderInProgress={addToOrderInProgress}
            onAddToOrder={handleAddToOrder}
            onQuantityChange={handleComponentQuantityChange}
            onRemove={handleRemoveComponent}
          />
        ))}
        {section.id === 'section1' &&
          cartServiceItems.map((item: CartServiceItem) => (
            <CartServiceItemCard
              key={`svc-${item.id}`}
              item={item}
              onRemove={removeCartServiceItemById}
            />
          ))}
        {(section.id === 'section2' || section.id === 'section3') &&
          section.orderServiceGroups.map((group, idx) => (
            <CartOrderServiceGroupCard
              key={`order-svc-${section.id}-${idx}`}
              group={group}
              sectionId={section.id}
              orderIdForServices={
                section.id === 'section2' ? orderIdForSection2 : approvedOrder?.id
              }
              index={idx}
            />
          ))}
      </div>

      <CartDeliverySection
        sectionId={section.id}
        wantDelivery={wantDelivery}
        orderWithDelivery={orderWithDelivery}
        handleDeliveryCheckboxChange={handleDeliveryCheckboxChange}
        deliveryForm={deliveryForm}
        setDeliveryForm={setDeliveryForm}
        deliveryPaymentMode={deliveryPaymentMode}
        deliverySettlements={deliverySettlements}
        deliveryFormValid={deliveryFormValid}
        deliveryCalculationLoading={deliveryCalculationLoading}
        deliveryCalculationError={deliveryCalculationError}
        calculatedDelivery={calculatedDelivery}
        pendingOrderHasDelivery={pendingOrderHasDelivery}
        returnedOrderHasDelivery={returnedOrderHasDelivery}
        approvedOrderHasDelivery={approvedOrderHasDelivery}
        approvedOrder={approvedOrder}
        approvalRemainingMs={approvalRemainingMs}
      />

      <CartSectionSummary
        section={section}
        cartSections={cartSections}
        cartServiceItems={cartServiceItems}
        wantDelivery={wantDelivery}
        orderWithDelivery={orderWithDelivery}
        calculatedDelivery={calculatedDelivery}
        deliveryPaymentMode={deliveryPaymentMode}
        pendingOrderHasDelivery={pendingOrderHasDelivery}
        returnedOrderHasDelivery={returnedOrderHasDelivery}
        approvedOrderHasDelivery={approvedOrderHasDelivery}
        returnedForCorrectionOrder={returnedForCorrectionOrder}
        canSubmitForReview={canSubmitForReview}
        submitInProgress={submitInProgress}
        cancelInProgress={cancelInProgress}
        pendingReviewOrder={pendingReviewOrder}
        approvedOrder={approvedOrder}
        approvalRemainingMs={approvalRemainingMs}
        canSendToEmail={canSendToEmail}
        onSubmitForReview={handleSubmitForReview}
        onCancelReview={handleCancelReview}
        onOpenSendToEmailModal={openSendToEmailModal}
      />
    </div>
  );
}

export function shouldShowCartSection(
  section: CartSectionData,
  cartServiceItems: CartServiceItem[],
  returnedForCorrectionOrder: CartPageModel['returnedForCorrectionOrder'],
  canSubmitForReview: boolean
): boolean {
  return (
    section.products.length > 0 ||
    section.components.length > 0 ||
    section.orderServiceGroups.length > 0 ||
    (section.id === 'section1' && cartServiceItems.length > 0) ||
    (section.id === 'section1' && !!returnedForCorrectionOrder && canSubmitForReview)
  );
}
