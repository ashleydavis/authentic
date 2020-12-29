/**
 * Put a space between elements.
 */

import * as React from 'react';

const defaultSize = 10;

export interface ISpacerProps {
    /**
     * Size of the space.
     */
    size?: number;

    /**
     * Maximize the size of the spacer.
     */
    max?: boolean;

    /**
     * Make the spacer 2x size.
     */
    x2?: boolean;

    /**
     * Make the spacer 3x size.
     */
    x3?: boolean;

    /**
     * Multiply the size of the spacer by an arbitrary value.
     */
    x?: number;
}

export class Spacer extends React.Component<ISpacerProps, {}> {

    render() {
        let size =  this.props.size !== undefined
            ? this.props.size
            : defaultSize;

        if (this.props.x !== undefined) {
            size *= this.props.x;
        }
        else if (this.props.x3) {
            size *= 3;
        }
        else if (this.props.x2) {
            size *= 2;
        }

        const style: any = {};

        if (this.props.max) {
            return (
                <div className="flex-grow" />
            );
        }
        else {
            style.width = size.toString() + "px";
        }

        return (
            <div 
                style={style}
                >
            </div>
        );
    }
}