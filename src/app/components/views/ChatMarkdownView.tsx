import { LinkableEntity, linkEntities, LinkTarget } from '@/domain/chat/EntityLinks';
import { InlineSpan, MarkdownBlock, parseMarkdownBlocks } from '@/domain/chat/MarkdownBlocks';
import {
  Box,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Renders the assistant's markdown subset with Material-UI components.
 *
 * The parser is in the domain layer (`MarkdownBlocks.ts`); this only maps blocks
 * to components, so there is no parsing logic to test through the DOM.
 */

/** Overflow smaller than this is rounding, not a column the reader is missing. */
const OVERFLOW_SLACK_PX = 8;

/** Below this the label column stacks one word per line, which is unreadable. */
const LABEL_COLUMN_MIN_PX = 104;

export interface ChatMarkdownViewProps {
  text: string;
  /** The user's own records, whose names become tappable. */
  entities: LinkableEntity[];
  onNavigate: (target: LinkTarget) => void;
}

function Spans({
  spans,
  onNavigate,
}: {
  spans: InlineSpan[];
  onNavigate: (target: LinkTarget) => void;
}) {
  return (
    <>
      {spans.map((span, index) => {
        if (span.code) {
          return (
            <Box
              key={index}
              component="code"
              sx={{
                px: 0.5,
                borderRadius: 0.5,
                bgcolor: 'action.hover',
                fontFamily: 'monospace',
                fontSize: '0.85em',
              }}
            >
              {span.text}
            </Box>
          );
        }
        if (span.link) {
          const target = span.link;
          return (
            <Link
              key={index}
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              onClick={() => onNavigate(target)}
              sx={{
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: span.bold ? 600 : undefined,
                verticalAlign: 'baseline',
              }}
            >
              {span.text}
            </Link>
          );
        }
        if (span.bold) {
          return (
            <Box key={index} component="strong" sx={{ fontWeight: 600 }}>
              {span.text}
            </Box>
          );
        }
        return <Fragment key={index}>{span.text}</Fragment>;
      })}
    </>
  );
}

function Block({
  block,
  onNavigate,
}: {
  block: MarkdownBlock;
  onNavigate: (target: LinkTarget) => void;
}) {
  switch (block.kind) {
    case 'heading':
      return (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
          <Spans spans={block.spans} onNavigate={onNavigate} />
        </Typography>
      );

    case 'paragraph':
      return (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          <Spans spans={block.spans} onNavigate={onNavigate} />
        </Typography>
      );

    case 'list':
      return (
        <Box component={block.ordered ? 'ol' : 'ul'} sx={{ m: 0, pl: 2.5, '& li': { mb: 0.25 } }}>
          {block.items.map((item, index) => (
            <li key={index}>
              <Typography variant="body2" component="span">
                <Spans spans={item} onNavigate={onNavigate} />
              </Typography>
            </li>
          ))}
        </Box>
      );

    case 'code':
      return (
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1,
            borderRadius: 1,
            bgcolor: 'action.hover',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            overflowX: 'auto',
          }}
        >
          {block.text}
        </Box>
      );

    case 'table':
      return <TableBlock block={block} onNavigate={onNavigate} />;
  }
}

/**
 * A wide table scrolls inside its own bubble rather than stretching the thread,
 * which would push the whole page sideways on a phone.
 *
 * Three things keep it usable at phone width: the label column wraps while
 * numeric columns stay on one line, cells are tighter than the MUI default, and
 * when the table still does not fit a hint says so — 140px of hidden column with
 * no cue reads as the app having truncated the data.
 */
function TableBlock({
  block,
  onNavigate,
}: {
  block: Extract<MarkdownBlock, { kind: 'table' }>;
  onNavigate: (target: LinkTarget) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // A few pixels of overflow is border and rounding, not a hidden column.
    const measure = () =>
      setOverflowing(scroller.scrollWidth - scroller.clientWidth > OVERFLOW_SLACK_PX);
    measure();

    // ResizeObserver is unavailable in some test environments; the measurement
    // above is still correct for the initial render.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [block]);

  // Headers wrap freely — "Invested (INR)" over two lines costs nothing and
  // narrows the column to the width of the figures under it.
  const headerSx = (index: number) => ({
    px: 1,
    fontWeight: 700,
    whiteSpace: 'normal' as const,
    ...(index === 0 ? { minWidth: LABEL_COLUMN_MIN_PX } : {}),
  });

  // Data cells: only the label wraps, and not below a width where it would
  // stack one word per line. Wrapping a number would split it across lines and
  // make the column unscannable.
  const cellSx = (index: number) =>
    index === 0
      ? { px: 1, whiteSpace: 'normal' as const, minWidth: LABEL_COLUMN_MIN_PX }
      : { px: 1, whiteSpace: 'nowrap' as const };

  return (
    <Box>
      <Paper variant="outlined" ref={scrollerRef} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {block.headers.map((header, index) => (
                <TableCell key={index} align={block.align[index]} sx={headerSx(index)}>
                  <Spans spans={header} onNavigate={onNavigate} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {block.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} align={block.align[cellIndex]} sx={cellSx(cellIndex)}>
                    <Spans spans={cell} onNavigate={onNavigate} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {overflowing && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
          Scroll the table sideways for more →
        </Typography>
      )}
    </Box>
  );
}

export function ChatMarkdownView({ text, entities, onNavigate }: ChatMarkdownViewProps) {
  const blocks = useMemo(() => linkEntities(parseMarkdownBlocks(text), entities), [text, entities]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {blocks.map((block, index) => (
        <Block key={index} block={block} onNavigate={onNavigate} />
      ))}
    </Box>
  );
}
