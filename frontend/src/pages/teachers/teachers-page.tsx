import { PageHeadingContent } from '@/shared/ui/page-heading-content';
import '@/pages/admin/catalog-actions.css';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import {
    buildTeacherListFilters,
    formatTeacherApiError,
    sliceTeacherPage,
    TEACHERS_PAGE_SIZE,
} from '@/features/teachers/model';
import {
    useSchoolsQuery,
    useTeachersListQuery,
} from '@/features/teachers/queries';
import type { School, Teacher } from '@/features/teachers/types';
import type { WorkspacePreview } from '@/features/workspace/types';
import { Icon } from '@/shared/ui/icon';
import { PortraitAvatar } from '@/shared/ui/portrait-avatar';
import { useToast } from '@/shared/ui/toast-context';
import { TeacherDeleteDialog } from './teacher-delete-dialog';
import { TeacherDetailDrawer } from './teacher-detail-drawer';
import { TeacherFormDialog } from './teacher-form-dialog';
import styles from './teachers-page.module.css';

type OutletWorkspaceContext = WorkspacePreview['contexts'][number] | undefined;

export function TeachersPage() {
    const outletContext = useOutletContext<OutletWorkspaceContext>();
    const notify = useToast();

    const activeRound = outletContext?.round ?? 'DANH MỤC';
    const activeSchoolLabel = outletContext?.school ?? 'Dữ liệu nhà trường';

    const [schoolFilter, setSchoolFilter] = useState<number | undefined>(
        undefined,
    );
    const [nameInput, setNameInput] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [debouncedCode, setDebouncedCode] = useState('');
    const [offset, setOffset] = useState(0);

    const [formState, setFormState] = useState<{
        open: boolean;
        teacher: Teacher | null;
        returnToDrawerTrigger?: boolean;
    }>({ open: false, teacher: null });
    const [deleteTarget, setDeleteTarget] = useState<{
        teacher: Teacher;
        returnToDrawerTrigger?: boolean;
    } | null>(null);
    const [detailTarget, setDetailTarget] = useState<Teacher | null>(null);
    const drawerTriggerRef = useRef<HTMLElement | null>(null);
    const addButtonRef = useRef<HTMLButtonElement | null>(null);
    const schoolFilterId = useId();
    const nameFilterId = useId();
    const codeFilterId = useId();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedQ(nameInput);
            setDebouncedCode(codeInput);
        }, 220);
        return () => window.clearTimeout(timer);
    }, [nameInput, codeInput]);

    function restoreDrawerTriggerIfNeeded(shouldRestore?: boolean) {
        if (!shouldRestore) return;
        window.requestAnimationFrame(() => {
            if (drawerTriggerRef.current?.isConnected) {
                drawerTriggerRef.current.focus();
            }
        });
    }

    const filters = useMemo(
        () =>
            buildTeacherListFilters({
                schoolId: schoolFilter,
                q: debouncedQ,
                teacherCode: debouncedCode,
                offset,
                pageSize: TEACHERS_PAGE_SIZE,
            }),
        [schoolFilter, debouncedQ, debouncedCode, offset],
    );

    const schoolsQuery = useSchoolsQuery();
    const teachersQuery = useTeachersListQuery(filters);

    const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
    const schoolsById = useMemo(
        () => new Map<number, School>(schools.map((item) => [item.id, item])),
        [schools],
    );

    const { items: rows, hasNext } = sliceTeacherPage(
        teachersQuery.data ?? [],
        TEACHERS_PAGE_SIZE,
    );

    const hasActiveFilter =
        schoolFilter !== undefined ||
        nameInput.trim() !== '' ||
        codeInput.trim() !== '';

    function clearAllFilters() {
        setSchoolFilter(undefined);
        setNameInput('');
        setCodeInput('');
        setDebouncedQ('');
        setDebouncedCode('');
        setOffset(0);
    }

    const currentPage = Math.floor(offset / TEACHERS_PAGE_SIZE) + 1;
    const rangeStart = rows.length > 0 ? offset + 1 : 0;
    const rangeEnd = offset + rows.length;
    const selectedSchool =
        schoolFilter !== undefined ? schoolsById.get(schoolFilter) : undefined;

    return (
        <div className={styles.teachersRoot}>
            <div className={`${styles.pageHeading} page-heading`}>
                <PageHeadingContent>
                    <div>
                        <div className={`${styles.eyebrow} eyebrow`}>
                            <span className={styles.sectionIndex}>
                                {activeRound}
                            </span>
                            <span className={styles.eyebrowDivider}>/</span>
                            <span>{activeSchoolLabel}</span>
                        </div>
                        <h1>Hồ sơ rõ ràng, phân công có căn cứ.</h1>
                        <p className={styles.subtitle}>
                            Tra cứu theo trường, mã giáo viên và cập nhật hồ sơ
                            đội ngũ giảng dạy.
                        </p>
                    </div>
                </PageHeadingContent>
                <div className={styles.headingActions}>
                    <button
                        ref={addButtonRef}
                        type="button"
                        className="btn primary"
                        onClick={() =>
                            setFormState({ open: true, teacher: null })
                        }
                    >
                        <Icon name="plus" />
                        Thêm giáo viên
                    </button>
                </div>
            </div>

            {schoolsQuery.isError && !teachersQuery.isError ? (
                <div className={styles.lookupBanner} role="alert">
                    <div className={styles.lookupBannerBody}>
                        <Icon name="warning" />
                        <span>
                            Không thể tải danh mục trường:{' '}
                            {formatTeacherApiError(schoolsQuery.error)}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="btn small"
                        disabled={schoolsQuery.isFetching}
                        onClick={() => void schoolsQuery.refetch()}
                    >
                        Thử lại
                    </button>
                </div>
            ) : null}

            <div className={styles.mvpToolbar}>
                <div className={styles.toolbarMeta}>
                    <span>
                        {teachersQuery.isPending
                            ? 'Đang tải danh sách giáo viên…'
                            : rows.length > 0
                              ? `Hiển thị ${rangeStart}–${rangeEnd} · ${selectedSchool ? selectedSchool.name : 'Tất cả trường'}`
                              : `0 hồ sơ khớp điều kiện · ${selectedSchool ? selectedSchool.name : 'Tất cả trường'}`}
                    </span>
                    {teachersQuery.isFetching && !teachersQuery.isPending ? (
                        <span className={styles.syncBadge} role="status">
                            Đang cập nhật…
                        </span>
                    ) : null}
                </div>

                <div className={styles.mvpFilter}>
                    <select
                        id={schoolFilterId}
                        name="school_id"
                        aria-label="Lọc theo trường"
                        value={
                            schoolFilter === undefined
                                ? 'all'
                                : String(schoolFilter)
                        }
                        onChange={(event) => {
                            const raw = event.target.value;
                            const nextSchool =
                                raw === 'all' ? undefined : Number(raw);
                            setSchoolFilter(nextSchool);
                            setOffset(0);
                        }}
                    >
                        <option value="all">Tất cả trường</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                                {school.name}
                            </option>
                        ))}
                    </select>

                    <div className={styles.inputWrap}>
                        <Icon name="search" />
                        <input
                            id={nameFilterId}
                            name="q"
                            type="search"
                            aria-label="Tìm theo họ và tên"
                            placeholder="Tìm theo họ và tên…"
                            value={nameInput}
                            onChange={(event) => {
                                setNameInput(event.target.value);
                                setOffset(0);
                            }}
                        />
                    </div>

                    <input
                        id={codeFilterId}
                        name="teacher_code"
                        type="search"
                        className={styles.codeInput}
                        aria-label="Lọc theo mã giáo viên"
                        placeholder="Mã GV (chính xác)…"
                        value={codeInput}
                        onChange={(event) => {
                            setCodeInput(event.target.value);
                            setOffset(0);
                        }}
                    />

                    {hasActiveFilter ? (
                        <button
                            type="button"
                            className="btn small"
                            onClick={clearAllFilters}
                        >
                            Xóa lọc
                        </button>
                    ) : null}
                </div>
            </div>

            {teachersQuery.isPending ? (
                <section className={styles.panel}>
                    <div
                        className={`${styles.stateCard} ${styles.stateLoading}`}
                        role="status"
                    >
                        <span className={`${styles.stateSymbol} icon-surface`}>
                            <Icon name="teachers" />
                        </span>
                        <h3>Đang tải danh sách giáo viên</h3>
                        <p>
                            Đang đọc dữ liệu đội ngũ và danh mục trường từ hệ
                            thống…
                        </p>
                    </div>
                </section>
            ) : teachersQuery.isError ? (
                <section className={styles.panel}>
                    <div
                        className={`${styles.stateCard} ${styles.stateError}`}
                        role="alert"
                    >
                        <span className={`${styles.stateSymbol} icon-surface`}>
                            <Icon name="warning" />
                        </span>
                        <h3>Không thể tải danh sách giáo viên</h3>
                        <p>{formatTeacherApiError(teachersQuery.error)}</p>
                        <div className={styles.stateActions}>
                            <button
                                type="button"
                                className="btn primary"
                                disabled={teachersQuery.isFetching}
                                onClick={() => {
                                    void teachersQuery.refetch();
                                    if (schoolsQuery.isError) {
                                        void schoolsQuery.refetch();
                                    }
                                }}
                            >
                                Thử lại
                            </button>
                        </div>
                    </div>
                </section>
            ) : (
                <section className={styles.panel}>
                    <div
                        className={styles.tableScroll}
                        role="region"
                        aria-label="Danh sách giáo viên"
                        tabIndex={0}
                    >
                        <table className={styles.mvpTable}>
                            <caption className="sr-only">
                                Danh sách giáo viên và trường công tác
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">GIÁO VIÊN</th>
                                    <th scope="col">TRƯỜNG HỌC</th>
                                    <th scope="col">TRẠNG THÁI TRƯỜNG</th>
                                    <th scope="col">ID HỒ SƠ</th>
                                    <th
                                        scope="col"
                                        className={styles.rightHeader}
                                    >
                                        THAO TÁC
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length > 0 ? (
                                    rows.map((teacher) => {
                                        const school = schoolsById.get(
                                            teacher.school_id,
                                        );
                                        const isActive =
                                            school?.status === 'ACTIVE';
                                        return (
                                            <tr key={teacher.id}>
                                                <td>
                                                    <span
                                                        className={
                                                            styles.personIdentity
                                                        }
                                                    >
                                                        <PortraitAvatar
                                                            portraitKey={
                                                                teacher.id
                                                            }
                                                            colorIndex={
                                                                teacher.id % 6
                                                            }
                                                        />
                                                        <span
                                                            className={
                                                                styles.personIdentityCopy
                                                            }
                                                        >
                                                            <strong>
                                                                {
                                                                    teacher.full_name
                                                                }
                                                            </strong>
                                                            <small>
                                                                {`${teacher.teacher_code} · ${school?.school_code ?? `Trường #${teacher.school_id}`}`}
                                                            </small>
                                                        </span>
                                                    </span>
                                                </td>
                                                <td>
                                                    <div
                                                        className={
                                                            styles.schoolCell
                                                        }
                                                    >
                                                        <strong>
                                                            {school?.name ??
                                                                `Trường #${teacher.school_id}`}
                                                        </strong>
                                                        <small>
                                                            {school?.school_code ??
                                                                `SCHOOL_${teacher.school_id}`}
                                                        </small>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`${styles.mvpStatus} ${isActive ? styles.statusActive : styles.statusOther}`}
                                                    >
                                                        {isActive
                                                            ? 'ACTIVE'
                                                            : (school?.status ??
                                                              'CHƯA RÕ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            styles.monoId
                                                        }
                                                    >
                                                        #{teacher.id}
                                                    </span>
                                                </td>
                                                <td
                                                    className={styles.rightCell}
                                                >
                                                    <div
                                                        className={
                                                            'catalog-row-actions'
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            title="Hồ sơ"
                                                            className="icon-btn"
                                                            aria-label={`Hồ sơ ${teacher.full_name}`}
                                                            onClick={(
                                                                event,
                                                            ) => {
                                                                drawerTriggerRef.current =
                                                                    event.currentTarget;
                                                                setDetailTarget(
                                                                    teacher,
                                                                );
                                                            }}
                                                        >
                                                            <Icon name="eye" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Sửa"
                                                            className="icon-btn"
                                                            aria-label={`Sửa ${teacher.full_name}`}
                                                            onClick={() =>
                                                                setFormState({
                                                                    open: true,
                                                                    teacher,
                                                                })
                                                            }
                                                        >
                                                            <Icon name="edit" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Xóa"
                                                            className="icon-btn catalog-delete-action"
                                                            aria-label={`Xóa ${teacher.full_name}`}
                                                            onClick={() =>
                                                                setDeleteTarget(
                                                                    {
                                                                        teacher,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <Icon name="trash" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5}>
                                            <div className={styles.mvpEmpty}>
                                                <div
                                                    className={
                                                        styles.mvpEmptyHeader
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            styles.mvpEmptyMark
                                                        }
                                                        aria-hidden="true"
                                                    />
                                                    <strong>
                                                        {hasActiveFilter
                                                            ? 'Không tìm thấy giáo viên phù hợp'
                                                            : 'Chưa có hồ sơ giáo viên'}
                                                    </strong>
                                                </div>
                                                <p>
                                                    {hasActiveFilter
                                                        ? 'Thử xóa bớt bộ lọc tên, mã giáo viên hoặc đổi phạm vi trường.'
                                                        : 'Chưa có bản ghi giáo viên nào trong danh sách hiện tại.'}
                                                </p>
                                                <div
                                                    className={
                                                        styles.mvpEmptyActions
                                                    }
                                                >
                                                    {offset > 0 ? (
                                                        <button
                                                            type="button"
                                                            className="btn small"
                                                            onClick={() =>
                                                                setOffset(
                                                                    (prev) =>
                                                                        Math.max(
                                                                            0,
                                                                            prev -
                                                                                TEACHERS_PAGE_SIZE,
                                                                        ),
                                                                )
                                                            }
                                                        >
                                                            Quay lại trang trước
                                                        </button>
                                                    ) : null}
                                                    {hasActiveFilter ? (
                                                        <button
                                                            type="button"
                                                            className="btn small"
                                                            onClick={
                                                                clearAllFilters
                                                            }
                                                        >
                                                            Xóa bộ lọc
                                                        </button>
                                                    ) : schools.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            className="btn primary small"
                                                            onClick={() =>
                                                                setFormState({
                                                                    open: true,
                                                                    teacher:
                                                                        null,
                                                                })
                                                            }
                                                        >
                                                            <Icon name="plus" />
                                                            Thêm giáo viên
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <nav className={styles.tableBottom} aria-label="Phân trang">
                        <span aria-live="polite">
                            Trang {currentPage}
                            {rows.length > 0
                                ? ` · Dòng ${rangeStart}–${rangeEnd}`
                                : ' · Không có dữ liệu'}
                        </span>
                        <div className={styles.paginationControls}>
                            <button
                                type="button"
                                className="btn small"
                                disabled={
                                    offset === 0 || teachersQuery.isFetching
                                }
                                onClick={() =>
                                    setOffset((prev) =>
                                        Math.max(0, prev - TEACHERS_PAGE_SIZE),
                                    )
                                }
                            >
                                <span className={styles.chevronPrev}>
                                    <Icon name="chevron" />
                                </span>
                                Trước
                            </button>
                            <button
                                type="button"
                                className="btn small"
                                disabled={!hasNext || teachersQuery.isFetching}
                                onClick={() =>
                                    setOffset(
                                        (prev) => prev + TEACHERS_PAGE_SIZE,
                                    )
                                }
                            >
                                Sau
                                <Icon name="chevron" />
                            </button>
                        </div>
                    </nav>
                </section>
            )}

            <TeacherFormDialog
                open={formState.open}
                teacher={formState.teacher}
                schools={schools}
                defaultSchoolId={schoolFilter}
                onClose={() => {
                    const shouldRestore = formState.returnToDrawerTrigger;
                    setFormState({ open: false, teacher: null });
                    restoreDrawerTriggerIfNeeded(shouldRestore);
                }}
                onSaved={(saved, mode) => {
                    const shouldRestore = formState.returnToDrawerTrigger;
                    setFormState({ open: false, teacher: null });
                    if (
                        mode === 'create' &&
                        ((schoolFilter !== undefined &&
                            schoolFilter !== saved.school_id) ||
                            debouncedQ.trim() !== '' ||
                            debouncedCode.trim() !== '')
                    ) {
                        clearAllFilters();
                    }
                    restoreDrawerTriggerIfNeeded(shouldRestore);
                    notify({
                        title:
                            mode === 'create'
                                ? 'Đã thêm giáo viên'
                                : 'Đã cập nhật hồ sơ giáo viên',
                        description: `${saved.full_name} (${saved.teacher_code})`,
                        tone: 'success',
                    });
                }}
            />

            <TeacherDeleteDialog
                teacher={deleteTarget?.teacher ?? null}
                school={
                    deleteTarget
                        ? schoolsById.get(deleteTarget.teacher.school_id)
                        : undefined
                }
                onClose={() => {
                    const shouldRestore = deleteTarget?.returnToDrawerTrigger;
                    setDeleteTarget(null);
                    restoreDrawerTriggerIfNeeded(shouldRestore);
                }}
                onDeleted={(deleted) => {
                    const wasOnlyRowOnPage = rows.length <= 1;
                    setDeleteTarget(null);
                    if (detailTarget?.id === deleted.id) {
                        setDetailTarget(null);
                    }
                    if (offset > 0 && wasOnlyRowOnPage) {
                        setOffset((prev) =>
                            Math.max(0, prev - TEACHERS_PAGE_SIZE),
                        );
                    }
                    window.requestAnimationFrame(() => {
                        addButtonRef.current?.focus();
                    });
                    notify({
                        title: 'Đã xóa hồ sơ giáo viên',
                        description: `${deleted.full_name} (${deleted.teacher_code})`,
                        tone: 'info',
                    });
                }}
            />

            <TeacherDetailDrawer
                teacherId={detailTarget?.id ?? null}
                fallbackTeacher={detailTarget}
                schoolsById={schoolsById}
                returnFocusRef={drawerTriggerRef}
                onClose={() => setDetailTarget(null)}
                onEdit={(teacher) => {
                    setDetailTarget(null);
                    setFormState({
                        open: true,
                        teacher,
                        returnToDrawerTrigger: true,
                    });
                }}
                onDelete={(teacher) => {
                    setDetailTarget(null);
                    setDeleteTarget({
                        teacher,
                        returnToDrawerTrigger: true,
                    });
                }}
            />
        </div>
    );
}
