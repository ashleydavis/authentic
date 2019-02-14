/**
 * A column of DOM elements.
 */

import * as React from 'react';

/**
 * Specifies the alignment of children.
 */
export enum ColumnAlign {
    Start = "flex-start",
    End = "flex-end",
    Center = "center",
    Baseline = "baseline",
    Stretch = "stretch",
}

/**
 * Specifies the justification of children.
 */
export enum ColumnJustify {
    Start = "flex-start",
    End = "flex-end",
    Center = "center",
}
export interface IColumnProps {
    //
    // Class for the row.
    //
    className?: string;

    //
    // Specifies the alignment of children.
    //
    alignItems?: ColumnAlign;

    //
    // Specifies the content justification for the column.
    //
    justifyContent?: ColumnJustify;
}

export class Column extends React.Component<IColumnProps, {}> {

    render() {
        return (
            <div 
                className={this.props.className}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: this.props.alignItems || ColumnAlign.Center,
                    justifyContent: this.props.justifyContent || ColumnJustify.Center,
                }}
                >
                {this.props.children}
            </div>
        );
    }
}