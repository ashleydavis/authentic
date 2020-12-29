import * as React from 'react';
import { HashRouter, Route, Switch, Redirect, Link } from 'react-router-dom';
import { HomeUI } from './home/home';
import { Page1UI } from './page1/page1';
import { Page2UI } from './page2/page2';
import { Authentication, IAuthentication } from '../services/authentication';
import { SignInUI } from './auth/sign-in';
import { SignUpUI } from './auth/sign-up';
import { ForgotPasswordUI } from './auth/forgot-password';
import { ConfirmSignUpUI } from './auth/confirm-sign-up';
import { SignUpConfirmedUI } from './auth/sign-up-confirmed';
import { PrivateRoute } from '../components/private-route';
import { PasswordResetRequestedUI } from './auth/password-reset-requested';
import { ResetPasswordUI } from './auth/reset-password';
import { asyncHandler } from '../utils/async-handler';

export interface IAppProps {
}

export interface IAppState {
}

export class AppUI extends React.Component<IAppProps, IAppState> {

    private authentication: IAuthentication = Authentication.getInstance(); //TODO: DI

    constructor(props: IAppProps) {
        super(props);

        this.state = {};

        this.componentWillMount = asyncHandler(this, this.componentWillMount);
    }

    async componentWillMount(): Promise<void> {
        //todo: Validate signed in state?
    }

    render() {
        return (
            <HashRouter>
                <Switch>
                    {/* Sign up, todo: can this be relgated to another module. */}
                    <Route path="/auth/signin">
                        <SignInUI />
                    </Route>
                    <Route path="/auth/forgot-password">
                        <ForgotPasswordUI />
                    </Route>
                    <Route 
                        path="/auth/password-reset-requested/:emailAddress"
                        component={PasswordResetRequestedUI}
                        />
                    <Route 
                        path="/auth/reset-password/:passwordResetToken?"
                        component={ResetPasswordUI}
                        />
                    <Route path="/auth/signup">
                        <SignUpUI />
                    </Route>
                    <Route 
                        path="/auth/confirm-signup/:emailAddress"
                        component={ConfirmSignUpUI}
                        />
                    <Route 
                        path="/auth/signup-confirmed/:confirmationToken?"
                        component={SignUpConfirmedUI}
                        />
                    <PrivateRoute path="/">
                        <HomeUI />
                    </PrivateRoute>

                    <Route render={() => <div>Error 404. No page here.</div>} />
                </Switch>
            </HashRouter>
        );
    }
}