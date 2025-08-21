import { ShippingMethod } from "../../../entities";
import { FlatRateCost } from "../../../entities/flat-rate-cost.entity";
import { MutationUpdateShippingMethodArgs } from "../../../types";
import {
  flatRateCostRepository,
  flatRateRepository,
  freeShippingRepository,
  localPickUpRepository,
  shippingMethodRepository,
  upsRepository,
} from "../repositories/repositories";
import { getShippingMethodById } from "./get-shipping-method.service";

/**
 * Updates an existing shipping method with the provided data.
 *
 * This version does not create new nested entities; it only updates existing ones.
 *
 * @param shippingMethod - The existing shipping method entity to update.
 * @param data - The update input data.
 * @param userId - The ID of the user performing the update.
 * @returns The updated ShippingMethod entity.
 */
export const updateShippingMethod = async (
  shippingMethod: ShippingMethod,
  data: MutationUpdateShippingMethodArgs,
  userId: string
): Promise<ShippingMethod> => {
  if (data.title) shippingMethod.title = data.title;
  if (data.status !== undefined) shippingMethod.status = data.status;
  if (data.description) shippingMethod.description = data.description;

  // Reset all embedded method types
  shippingMethod.flatRate = null;
  shippingMethod.freeShipping = null;
  shippingMethod.localPickUp = null;
  shippingMethod.ups = null;

  // 1. Flat Rate
  if (data.flatRate) {
    let flatRate;

    if (data.flatRate.id) {
      flatRate = await flatRateRepository.findOneOrFail({
        where: { id: data.flatRate.id },
        relations: ["costs"],
      });
    } else {
      flatRate = flatRateRepository.create();
      flatRate.createdBy = userId;
    }

    flatRate.title = data.flatRate.title ?? flatRate.title;
    flatRate.taxStatus = data.flatRate.taxStatus ?? flatRate.taxStatus;
    flatRate.cost = data.flatRate.cost ?? flatRate.cost;

    if (data.flatRate.costs) {
      const updatedCosts: FlatRateCost[] = [];

      for (const costData of data.flatRate.costs) {
        let cost;

        if (costData.id) {
          cost = await flatRateCostRepository.findOneOrFail({
            where: { id: costData.id },
          });
        } else {
          cost = flatRateCostRepository.create();
        }

        cost.cost = costData.cost ?? 0;
        cost.shippingClass = { id: costData.shippingClassId } as any;

        updatedCosts.push(cost);
      }

      flatRate.costs = updatedCosts;
    }

    await flatRateRepository.save(flatRate);
    shippingMethod.flatRate = flatRate;
  }

  // 2. Free Shipping
  if (data.freeShipping) {
    let freeShipping;

    if (data.freeShipping.id) {
      freeShipping = await freeShippingRepository.findOneOrFail({
        where: { id: data.freeShipping.id },
      });
    } else {
      freeShipping = freeShippingRepository.create();
      freeShipping.createdBy = userId;
    }

    freeShipping.title = data.freeShipping.title ?? freeShipping.title;
    freeShipping.conditions =
      data.freeShipping.conditions ?? freeShipping.conditions;
    freeShipping.minimumOrderAmount =
      data.freeShipping.minimumOrderAmount ?? freeShipping.minimumOrderAmount;
    freeShipping.applyMinimumOrderRuleBeforeCoupon =
      data.freeShipping.applyMinimumOrderRuleBeforeCoupon ??
      freeShipping.applyMinimumOrderRuleBeforeCoupon;

    await freeShippingRepository.save(freeShipping);
    shippingMethod.freeShipping = freeShipping;
  }

  // 3. Local PickUp
  if (data.localPickUp) {
    let localPickUp;

    if (data.localPickUp.id) {
      localPickUp = await localPickUpRepository.findOneOrFail({
        where: { id: data.localPickUp.id },
      });
    } else {
      localPickUp = localPickUpRepository.create();
      localPickUp.createdBy = userId;
    }

    localPickUp.title = data.localPickUp.title ?? localPickUp.title;
    localPickUp.taxStatus = data.localPickUp.taxStatus ?? localPickUp.taxStatus;
    localPickUp.cost = data.localPickUp.cost ?? localPickUp.cost;

    await localPickUpRepository.save(localPickUp);
    shippingMethod.localPickUp = localPickUp;
  }

  // 4. UPS
  if (data.ups) {
    let ups;

    if (data.ups.id) {
      ups = await upsRepository.findOneOrFail({
        where: { id: data.ups.id },
      });
    } else {
      ups = upsRepository.create();
      ups.createdBy = userId;
    }

    ups.title = data.ups.title ?? ups.title;

    await upsRepository.save(ups);
    shippingMethod.ups = ups;
  }

  await shippingMethodRepository.save(shippingMethod);
  return getShippingMethodById(shippingMethod.id);
};
