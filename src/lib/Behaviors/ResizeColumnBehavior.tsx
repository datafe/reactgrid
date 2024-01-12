import React from "react";
import {
  Direction,
  GridColumn,
  PointerLocation,
  Range,
  getScrollOfScrollableElement,
  getReactGridOffsets,
  getStickyOffset,
  getVisibleSizeOfReactGrid,
  CellMatrix,
  Id,
  Cell,
  TextCell,
} from "../../core";
import { PointerEvent } from "../Model/domEventsTypes";
import { State } from "../Model/State";
import { Behavior } from "../Model/Behavior";
import { ResizeHint } from "../Components/ResizeHint";


export class ResizeColumnBehavior extends Behavior {
  // TODO min / max column with on column object
  private resizedColumn!: GridColumn;
  private initialLocation!: PointerLocation;
  autoScrollDirection: Direction = "horizontal";
  isInScrollableRange!: boolean;

  handlePointerDown(
    event: PointerEvent,
    location: PointerLocation,
    state: State
  ): State {
    this.initialLocation = location;
    this.resizedColumn = location.column;
    this.isInScrollableRange = state.cellMatrix.scrollableRange.columns.some(
      (c) => c.idx === this.resizedColumn.idx
    );
    return state;
  }
  handlePointerMove(
    event: PointerEvent,
    location: PointerLocation,
    state: State
  ): State {
    let linePosition = location.viewportX;
    if (
      !(
        (location.column.idx === this.resizedColumn.idx &&
          location.cellX > (state.props?.minColumnWidth ?? CellMatrix.MIN_COLUMN_WIDTH)) ||
        location.column.idx > this.resizedColumn.idx
      )
    ) {
      const offset = this.getLinePositionOffset(state);
      linePosition =
        (state.props?.minColumnWidth ?? CellMatrix.MIN_COLUMN_WIDTH) + this.resizedColumn.left + offset;
    }
    return { ...state, linePosition, lineOrientation: "vertical" };
  }

  handlePointerUp(
    event: PointerEvent,
    location: PointerLocation,
    state: State
  ): State {
    const newWidth =
      this.resizedColumn.width +
      location.viewportX -
      this.initialLocation.viewportX;
    if (state.props?.onColumnResized) {
      const newColWidth =
        newWidth >= (state.props?.minColumnWidth ?? CellMatrix.MIN_COLUMN_WIDTH)
          ? newWidth
          : (state.props?.minColumnWidth ?? CellMatrix.MIN_COLUMN_WIDTH);
      state.props.onColumnResized(
        this.resizedColumn.columnId,
        newColWidth,
        state.selectedIds
      );
    }
    let focusedLocation = state.focusedLocation;
    if (
      focusedLocation !== undefined &&
      this.resizedColumn.columnId === focusedLocation.column.idx
    ) {
      const column = { ...focusedLocation.column, width: newWidth };
      focusedLocation = { ...focusedLocation, column };
    }
    return { ...state, linePosition: -1, focusedLocation };
  }

  //should render ResizeHint on pane which has got the highest priority
  renderPanePart(state: State, pane: Range): React.ReactNode {
    const offset = this.getLinePositionOffset(state);
    return (
      pane.contains(this.initialLocation) && (
        <ResizeHint
          left={this.resizedColumn.left}
          linePosition={state.linePosition}
          offset={offset}
        />
      )
    );
  }

  getLinePositionOffset(state: State): number {
    const { scrollLeft } = getScrollOfScrollableElement(
      state.scrollableElement
    );
    const { left } = getReactGridOffsets(state);
    const leftStickyOffset = getStickyOffset(scrollLeft, left);
    const rightStickyOffset =
      getVisibleSizeOfReactGrid(state).width +
      leftStickyOffset -
      state.cellMatrix.ranges.stickyRightRange.width;
    let offset = 0;
    if (
      state.cellMatrix.scrollableRange.columns.some(
        (c) => c.idx === this.resizedColumn.idx
      )
    ) {
      offset = state.cellMatrix.ranges.stickyLeftRange.width;
    } else if (
      state.cellMatrix.ranges.stickyRightRange.columns.some(
        (c) => c.idx === this.resizedColumn.idx
      )
    ) {
      offset = rightStickyOffset;
    } else {
      offset = scrollLeft;
    }
    return offset;
  }
  
  handleDoubleClick(event: PointerEvent, location: PointerLocation, state: State): State {
    this.initialLocation = location;
    this.resizedColumn = location.column;
    // You may need to implement a method to calculate the optimal width of the current column, for example:
    const newWidth = this.calculateOptimalColumnWidth(this.resizedColumn.columnId, state);
    // const newWidth = 500;

    if (state.props?.onColumnResized) {
      const newColWidth =
        newWidth >= (state.props?.minColumnWidth ?? CellMatrix.MIN_COLUMN_WIDTH)
          ? newWidth
          : state.props?.minColumnWidth ?? CellMatrix.MIN_COLUMN_WIDTH;
      state.props.onColumnResized(this.resizedColumn.columnId, newColWidth, state.selectedIds);
    }
    let focusedLocation = state.focusedLocation;
    if (focusedLocation !== undefined && this.resizedColumn.columnId === focusedLocation.column.idx) {
      const column = { ...focusedLocation.column, width: newWidth };
      focusedLocation = { ...focusedLocation, column };
    }
    return { ...state, linePosition: -1, focusedLocation };
  }

  /**
   * Iterate through all the cells in the column, finding the widest content, and return the new column width.
   * @param columnId
   * @param state
   * @returns
   */
  calculateOptimalColumnWidth(columnId: Id, state: State): number {
    let maxWidth = 0;

    state.cellMatrix.rows.forEach((row) => {
      row.cells.forEach((cell: Cell) => {
        const contentWidth = this.measureTextWidth((cell as TextCell)?.text);
        if (contentWidth > maxWidth) {
          maxWidth = contentWidth;
        }
      });
    });

    // Add some extra space in case the text gets truncated
    return maxWidth + 10;
  }

  /**
   * Use the Canvas API to calculate the width of a given text and font style
   * @param text
   * @returns
   */
  measureTextWidth(text: string): number {
    const bodyElement = document.querySelector("body");
    if (bodyElement) {
      const style = getComputedStyle(bodyElement);
      const fontSize = style?.fontSize;
      const fontFamily = style?.fontFamily;
      const context = document.createElement("canvas").getContext("2d");
      if (context) {
        context.font = `${fontSize} ${fontFamily}`;
        return context.measureText(text).width;
      } else {
        console.error('document.createElement("canvas").getContext("2d") returns a null value');
        return CellMatrix.DEFAULT_COLUMN_WIDTH;
      }
    } else {
      console.error('document.querySelector("body") returns a null value');
      return CellMatrix.DEFAULT_COLUMN_WIDTH;
    }
  }
}
