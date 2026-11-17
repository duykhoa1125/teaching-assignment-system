import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { PageHeadingTarget } from './page-heading-context';

/** Keep page-owned titles reactive while presenting them in the shell header. */
export function PageHeadingContent({ children }: { children: ReactNode }) {
    const target = useContext(PageHeadingTarget);
    return target
        ? createPortal(
              <div className="header-page-copy">{children}</div>,
              target,
          )
        : children;
}
