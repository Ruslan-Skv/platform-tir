'use client';

import { useEffect, useMemo } from 'react';

import type { InstallerMaster } from '@/shared/api/admin-crm';

import { normalizeWindowsWorkOrderMarkupPercent } from '../../families/product-like/print/productWorkOrder';
import {
  type InstallerGradePercent,
  buildFinalEstimateSummary,
  normalizeWorkOrderGrade,
  parseInstallerGradePercent,
  parsePercentForWorkOrder,
} from '../editor/finalEstimateSummary';
import type { EstimateEmbedSection } from '../estimates/packageEstimateDocPrintEmbedHtml';
import {
  applyPackageContractDiscountToAmount,
  packageContractDiscountMoneyFactor,
  parsePackageContractDiscountPercent,
} from '../form/packageContractDiscount';
import type { PackageFormData } from '../form/packageForm';

export type UsePackageFinalEstimateWorkOrdersOptions = {
  form: PackageFormData;
  selectedEstimateSections: EstimateEmbedSection[];
  isProductDirectionPackage: boolean;
  windowsWorkOrderMarkupPercent: number;
  selectedInstallers: InstallerMaster[];
  selectedInstallersById: Map<string, InstallerMaster>;
  activeFinalWorkOrderDocId: string;
  setActiveFinalWorkOrderDocId: (id: string) => void;
};

export function usePackageFinalEstimateWorkOrders({
  form,
  selectedEstimateSections,
  isProductDirectionPackage,
  windowsWorkOrderMarkupPercent,
  selectedInstallers,
  selectedInstallersById,
  activeFinalWorkOrderDocId,
  setActiveFinalWorkOrderDocId,
}: UsePackageFinalEstimateWorkOrdersOptions) {
  const finalEstimateSummary = useMemo(() => buildFinalEstimateSummary(form), [form]);

  const contractDiscountPercentParsed = useMemo(
    () => parsePackageContractDiscountPercent(form.contract.discountPercent),
    [form.contract.discountPercent]
  );

  const finalEstimateTotalAfterDiscount = useMemo(
    () =>
      applyPackageContractDiscountToAmount(
        finalEstimateSummary.totalAmount,
        contractDiscountPercentParsed
      ),
    [finalEstimateSummary.totalAmount, contractDiscountPercentParsed]
  );

  const finalEstimateRooms = useMemo(() => {
    const roomMap = new Map<
      string,
      {
        name: string;
        total: number;
        lines: Array<{
          key: string;
          name: string;
          unit: string;
          quantity: number;
          price: number;
          amount: number;
          includedQuantity: number;
          excludedQuantity: number;
        }>;
      }
    >();
    for (const row of finalEstimateSummary.rows) {
      const room = roomMap.get(row.roomName) ?? {
        name: row.roomName,
        total: 0,
        lines: [],
      };
      const price = row.quantity > 0 ? row.amount / row.quantity : 0;
      room.lines.push({
        key: row.key,
        name: row.workName,
        unit: row.unit,
        quantity: row.quantity,
        price,
        amount: row.amount,
        includedQuantity: row.includedQuantity,
        excludedQuantity: row.excludedQuantity,
      });
      room.total += row.amount;
      roomMap.set(row.roomName, room);
    }
    return [...roomMap.values()];
  }, [finalEstimateSummary.rows]);

  const interactiveFinalEstimateSections = useMemo(() => {
    const rowByKey = new Map(
      finalEstimateSummary.rows.map((row) => [
        row.key,
        {
          ...row,
          installerId: form.finalEstimateInstallerAssignments[row.key]?.installerId ?? '',
        },
      ])
    );
    const consumed = new Set<string>();
    const sections: Array<{
      categoryName: string;
      rooms: Array<{
        name: string;
        lines: Array<{
          key: string;
          workName: string;
          unit: string;
          quantity: number;
          amount: number;
          installerId: string;
        }>;
      }>;
    }> = [];

    for (const section of selectedEstimateSections) {
      const rooms = section.rooms
        .map((room) => {
          const lines = room.lines
            .map((line) => {
              const key = `${room.name}::${line.name}::${line.unit}`;
              const row = rowByKey.get(key);
              if (!row || consumed.has(key)) return null;
              consumed.add(key);
              return {
                key: row.key,
                workName: row.workName,
                unit: row.unit,
                quantity: row.quantity,
                amount: row.amount,
                installerId: row.installerId,
              };
            })
            .filter(
              (
                row
              ): row is {
                key: string;
                workName: string;
                unit: string;
                quantity: number;
                amount: number;
                installerId: string;
              } => Boolean(row)
            );
          if (lines.length === 0) return null;
          return { name: room.name, lines };
        })
        .filter(
          (
            room
          ): room is {
            name: string;
            lines: Array<{
              key: string;
              workName: string;
              unit: string;
              quantity: number;
              amount: number;
              installerId: string;
            }>;
          } => Boolean(room)
        );
      if (rooms.length > 0) {
        sections.push({ categoryName: section.categoryName, rooms });
      }
    }

    const ungroupedByRoom = new Map<
      string,
      Array<{
        key: string;
        workName: string;
        unit: string;
        quantity: number;
        amount: number;
        installerId: string;
      }>
    >();
    for (const row of rowByKey.values()) {
      if (consumed.has(row.key)) continue;
      const roomLines = ungroupedByRoom.get(row.roomName) ?? [];
      roomLines.push({
        key: row.key,
        workName: row.workName,
        unit: row.unit,
        quantity: row.quantity,
        amount: row.amount,
        installerId: row.installerId,
      });
      ungroupedByRoom.set(row.roomName, roomLines);
    }
    if (ungroupedByRoom.size > 0) {
      sections.push({
        categoryName: '—',
        rooms: [...ungroupedByRoom.entries()].map(([name, lines]) => ({ name, lines })),
      });
    }
    return sections;
  }, [finalEstimateSummary.rows, form.finalEstimateInstallerAssignments, selectedEstimateSections]);

  const unassignedInteractiveRowsCount = useMemo(
    () =>
      finalEstimateSummary.rows.filter(
        (row) => !form.finalEstimateInstallerAssignments[row.key]?.installerId
      ).length,
    [finalEstimateSummary.rows, form.finalEstimateInstallerAssignments]
  );

  const finalWorkOrderComputed = useMemo(() => {
    const discountFactor = packageContractDiscountMoneyFactor(
      parsePackageContractDiscountPercent(form.contract.discountPercent)
    );
    const windowsMarkupFactor = isProductDirectionPackage
      ? 1 - normalizeWindowsWorkOrderMarkupPercent(windowsWorkOrderMarkupPercent) / 100
      : 1;
    const taxPercent = isProductDirectionPackage
      ? 0
      : parsePercentForWorkOrder(form.workOrder.taxPercent);
    const markupPercent = isProductDirectionPackage
      ? normalizeWindowsWorkOrderMarkupPercent(windowsWorkOrderMarkupPercent)
      : parsePercentForWorkOrder(form.workOrder.markupPercent);
    const fallbackGradeIncreasePercent = isProductDirectionPackage
      ? 0
      : normalizeWorkOrderGrade(form.workOrder.gradeIncreasePercent);
    const roomTotals: number[] = [];
    const installerTotalsMap = new Map<
      string,
      {
        installer: InstallerMaster;
        gradeIncreasePercent: InstallerGradePercent;
        lineCount: number;
        total: number;
      }
    >();
    const rooms = finalEstimateRooms.map((room) => {
      const lines = room.lines.map((line) => {
        const assignedInstallerId =
          form.finalEstimateInstallerAssignments[line.key]?.installerId ?? '';
        const assignedInstaller = selectedInstallersById.get(assignedInstallerId) ?? null;
        const gradeIncreasePercent = isProductDirectionPackage
          ? 0
          : assignedInstaller
            ? parseInstallerGradePercent(assignedInstaller.grade)
            : fallbackGradeIncreasePercent;
        const gradeFactor = isProductDirectionPackage ? 1 : 1 + gradeIncreasePercent / 100;
        const priceFactor = isProductDirectionPackage
          ? discountFactor * windowsMarkupFactor
          : discountFactor * (1 - taxPercent / 100) * (1 - markupPercent / 100) * gradeFactor;
        const adjustedPrice = line.price * priceFactor;
        const adjustedAmount = line.amount * priceFactor;
        if (assignedInstaller) {
          const prev = installerTotalsMap.get(assignedInstaller.id) ?? {
            installer: assignedInstaller,
            gradeIncreasePercent,
            lineCount: 0,
            total: 0,
          };
          prev.lineCount += 1;
          prev.total += adjustedAmount;
          installerTotalsMap.set(assignedInstaller.id, prev);
        }
        return {
          ...line,
          adjustedPrice,
          adjustedAmount,
          installerId: assignedInstaller?.id ?? '',
          installerFullName: assignedInstaller?.fullName ?? '',
          installerGrade: assignedInstaller?.grade ?? '',
          installerGradeIncreasePercent: gradeIncreasePercent,
        };
      });
      const adjustedTotal = lines.reduce((sum, line) => sum + line.adjustedAmount, 0);
      roomTotals.push(adjustedTotal);
      return { ...room, lines, adjustedTotal };
    });
    const total = roomTotals.reduce((sum, x) => sum + x, 0);
    const installerTotals = [...installerTotalsMap.values()].sort((a, b) =>
      a.installer.fullName.localeCompare(b.installer.fullName, 'ru')
    );
    return { rooms, total, installerTotals };
  }, [
    finalEstimateRooms,
    isProductDirectionPackage,
    windowsWorkOrderMarkupPercent,
    form.workOrder.taxPercent,
    form.workOrder.markupPercent,
    form.workOrder.gradeIncreasePercent,
    form.contract.discountPercent,
    form.finalEstimateInstallerAssignments,
    selectedInstallersById,
  ]);

  const finalWorkOrderCategorySections = useMemo(() => {
    const adjustedByKey = new Map<
      string,
      {
        adjustedAmount: number;
        quantity: number;
        unit: string;
      }
    >();
    for (const room of finalWorkOrderComputed.rooms) {
      for (const line of room.lines) {
        adjustedByKey.set(line.key, {
          adjustedAmount: line.adjustedAmount,
          quantity: line.quantity,
          unit: line.unit,
        });
      }
    }
    return interactiveFinalEstimateSections
      .map((section) => {
        const rooms = section.rooms
          .map((room) => {
            const lines = room.lines
              .map((line) => {
                const adjusted = adjustedByKey.get(line.key);
                if (!adjusted) return null;
                return {
                  ...line,
                  adjustedAmount: adjusted.adjustedAmount,
                  quantity: adjusted.quantity,
                  unit: adjusted.unit,
                };
              })
              .filter(
                (
                  line
                ): line is {
                  key: string;
                  workName: string;
                  unit: string;
                  quantity: number;
                  amount: number;
                  installerId: string;
                  adjustedAmount: number;
                } => Boolean(line)
              );
            if (lines.length === 0) return null;
            return {
              ...room,
              lines,
              adjustedTotal: lines.reduce((sum, line) => sum + line.adjustedAmount, 0),
            };
          })
          .filter(
            (
              room
            ): room is {
              name: string;
              lines: Array<{
                key: string;
                workName: string;
                unit: string;
                quantity: number;
                amount: number;
                installerId: string;
                adjustedAmount: number;
              }>;
              adjustedTotal: number;
            } => Boolean(room)
          );
        if (rooms.length === 0) return null;
        return {
          categoryName: section.categoryName,
          rooms,
          adjustedTotal: rooms.reduce((sum, room) => sum + room.adjustedTotal, 0),
        };
      })
      .filter(
        (
          section
        ): section is {
          categoryName: string;
          rooms: Array<{
            name: string;
            lines: Array<{
              key: string;
              workName: string;
              unit: string;
              quantity: number;
              amount: number;
              installerId: string;
              adjustedAmount: number;
            }>;
            adjustedTotal: number;
          }>;
          adjustedTotal: number;
        } => Boolean(section)
      );
  }, [finalWorkOrderComputed.rooms, interactiveFinalEstimateSections]);

  const perInstallerWorkOrders = useMemo(() => {
    return selectedInstallers
      .map((installer) => {
        const categories = finalWorkOrderCategorySections
          .map((section) => {
            const rooms = section.rooms
              .map((room) => {
                const lines = room.lines.filter((line) => line.installerId === installer.id);
                if (lines.length === 0) return null;
                return {
                  name: room.name,
                  lines,
                  adjustedTotal: lines.reduce((sum, line) => sum + line.adjustedAmount, 0),
                };
              })
              .filter(
                (
                  room
                ): room is {
                  name: string;
                  lines: Array<{
                    key: string;
                    workName: string;
                    unit: string;
                    quantity: number;
                    amount: number;
                    installerId: string;
                    adjustedAmount: number;
                  }>;
                  adjustedTotal: number;
                } => Boolean(room)
              );
            if (rooms.length === 0) return null;
            return {
              categoryName: section.categoryName,
              rooms,
              adjustedTotal: rooms.reduce((sum, room) => sum + room.adjustedTotal, 0),
            };
          })
          .filter(
            (
              section
            ): section is {
              categoryName: string;
              rooms: Array<{
                name: string;
                lines: Array<{
                  key: string;
                  workName: string;
                  unit: string;
                  quantity: number;
                  amount: number;
                  installerId: string;
                  adjustedAmount: number;
                }>;
                adjustedTotal: number;
              }>;
              adjustedTotal: number;
            } => Boolean(section)
          );
        const total = categories.reduce((sum, category) => sum + category.adjustedTotal, 0);
        const lineCount = categories.reduce(
          (sum, category) =>
            sum + category.rooms.reduce((rSum, room) => rSum + room.lines.length, 0),
          0
        );
        return {
          installer,
          categories,
          total,
          lineCount,
        };
      })
      .filter((row) => row.lineCount > 0);
  }, [selectedInstallers, finalWorkOrderCategorySections]);

  const activeInstallerWorkOrder = useMemo(() => {
    if (activeFinalWorkOrderDocId === 'common') return null;
    return (
      perInstallerWorkOrders.find((row) => row.installer.id === activeFinalWorkOrderDocId) ?? null
    );
  }, [activeFinalWorkOrderDocId, perInstallerWorkOrders]);

  useEffect(() => {
    const allowed = new Set(['common', ...perInstallerWorkOrders.map((row) => row.installer.id)]);
    if (!allowed.has(activeFinalWorkOrderDocId)) {
      setActiveFinalWorkOrderDocId('common');
    }
  }, [perInstallerWorkOrders, activeFinalWorkOrderDocId, setActiveFinalWorkOrderDocId]);

  return {
    finalEstimateSummary,
    contractDiscountPercentParsed,
    finalEstimateTotalAfterDiscount,
    finalEstimateRooms,
    interactiveFinalEstimateSections,
    unassignedInteractiveRowsCount,
    finalWorkOrderComputed,
    finalWorkOrderCategorySections,
    perInstallerWorkOrders,
    activeInstallerWorkOrder,
  };
}
