import { Component, type PropsWithChildren } from 'react';

export class AppErrorBoundary extends Component<
    PropsWithChildren,
    { hasError: boolean }
> {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return (
                <main className="fatal-error" role="alert">
                    <h1>Không thể hiển thị trang</h1>
                    <p>Hãy tải lại trang để tiếp tục làm việc.</p>
                    <button
                        className="button"
                        onClick={() => window.location.reload()}
                    >
                        Tải lại trang
                    </button>
                </main>
            );
        }
        return this.props.children;
    }
}
