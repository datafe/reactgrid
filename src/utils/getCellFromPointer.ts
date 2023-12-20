import { getRowAndColumns } from "./getRowAndColumns";
import { getCellPane, getStickyPaneDirection, isCellSticky } from "./cellUtils";
import { ReactGridStore } from "./reactGridStore";
import { getContainerFromPoint } from "./getLocationFromClient";
import { getScrollOfScrollableElement, getScrollableParent } from "./scrollHelpers";
import { calcScrollBy } from "./calcScrollBy";
import { get } from "http";
import { getNonStickyCell } from "./getNonStickyCell";
import { createMultiplierFromDistance } from "./createMultiplierFromDistance";

/**
 * Retrieves the grid cell or coordinates (rowIndex, colIndex) based on pointer coordinates.
 * @param {ReactGridStore} store - The ReactGridStore instance.
 * @param {number} clientX - The X-coordinate of the pointer.
 * @param {number} clientY - The Y-coordinate of the pointer.
 * @returns {HTMLElement | { rowIndex: number; colIndex: number }} - Returns either an HTMLElement representing the cell container or an object containing rowIndex and colIndex.
 */


// ! This function does more than it should.
// TODO: Remove scrolling behaviour from this function
export const getCellFromPointer = (
  store: ReactGridStore,
  clientX: number,
  clientY: number
):
  | { rowIndex: number; colIndex: number }
  | { rowIndex: number; colIndex: number; secondCellRowIndex: number; secondCellColIndex: number } => {
  // Return if no expectations were met
  const defaultReturn = { rowIndex: -1, colIndex: -1 };

  // Get HTMLElement that contains rendered cell data
  const cellContainer = getContainerFromPoint(clientX, clientY);

  if (!cellContainer) return defaultReturn;

  // Get information about rows and columns from cellContainer
  const rowsAndColumns = getRowAndColumns(cellContainer);

  if (!rowsAndColumns) return defaultReturn;

  const { rowIndex, colIndex } = rowsAndColumns;

  // Get information about cell based on its row and column
  const hoveredCell = store.getCellByIndexes(rowIndex, colIndex);

  if (!hoveredCell) return defaultReturn;

  // If cell is sticky, TRY to find cellContainer under the sticky. If there is no such element, select the sticky.
  if (isCellSticky(store, hoveredCell)) {
    const cellUnderTheSticky = getNonStickyCell(store, clientX, clientY);

    // If there is no cell under sticky, try to select sticky cell.
    if (!cellUnderTheSticky) return { rowIndex, colIndex };

    const hoveredCellRowsAndColumns = getRowAndColumns(cellUnderTheSticky || cellContainer)!;
    if (hoveredCellRowsAndColumns) {
      const { rowIndex: secondCellRowIndex, colIndex: secondCellColIndex } = hoveredCellRowsAndColumns;
      return { rowIndex, colIndex, secondCellRowIndex, secondCellColIndex };
    }
  } 
  return { rowIndex, colIndex };
  
};
