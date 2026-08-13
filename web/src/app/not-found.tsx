"use client";

import { useCallback, useEffect, useRef } from "react";

/* ============================================================
   TYPES
============================================================ */

interface ArtCell {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
}

interface BallTrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: BallTrailPoint[];
}

interface PointBrick {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationVelocity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

/* ============================================================
   CONFIGURATION
============================================================ */

/*
 * The exact reference artwork placed in /public.
 */
const ART_SRC = "/aence-404-exact.png";

/*
 * Prepared artwork dimensions.
 */
const ART_WIDTH = 380;
const ART_HEIGHT = 385;

/*
 * Collision/destruction resolution.
 *
 * 5px keeps the artwork detailed while avoiding
 * excessive collision checks.
 */
const ART_CELL_SIZE = 5;

/*
 * Paddle.
 */
const BASE_PADDLE_WIDTH = 116;
const MAX_PADDLE_WIDTH = 380;
const PADDLE_HEIGHT = 9;

/*
 * Ball physics.
 */
const BALL_BASE_SPEED = 5.2;
const BALL_MAX_SPEED = 9;
const MAX_BALLS = 8;

/*
 * Falling fragment physics.
 */
const POINT_GRAVITY = 0.15;

/*
 * Keyboard movement.
 */
const KEYBOARD_SPEED = 9;

/* ============================================================
   HELPERS
============================================================ */

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

function randomBetween(
  min: number,
  max: number,
) {
  return (
    Math.random() *
    (max - min) +
    min
  );
}

function circleIntersectsRect(
  cx: number,
  cy: number,
  radius: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const closestX = clamp(
    cx,
    x,
    x + width,
  );

  const closestY = clamp(
    cy,
    y,
    y + height,
  );

  const dx = cx - closestX;
  const dy = cy - closestY;

  return (
    dx * dx + dy * dy <=
    radius * radius
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(
    radius,
    width / 2,
    height / 2,
  );

  ctx.beginPath();

  ctx.moveTo(
    x + r,
    y,
  );

  ctx.lineTo(
    x + width - r,
    y,
  );

  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + r,
  );

  ctx.lineTo(
    x + width,
    y + height - r,
  );

  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height,
  );

  ctx.lineTo(
    x + r,
    y + height,
  );

  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - r,
  );

  ctx.lineTo(
    x,
    y + r,
  );

  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y,
  );

  ctx.closePath();
}

/* ============================================================
   COMPONENT
============================================================ */

export default function NotFound() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const animationFrameRef =
    useRef<number | null>(null);

  /*
   * Mutable game state.
   *
   * Keeping this outside React state prevents
   * the canvas loop from triggering React renders
   * every frame.
   */
  const gameRef = useRef({
    caughtPoints: 0,
    nextBallAt: 5,
    paddleWidth:
      BASE_PADDLE_WIDTH,
  });

  const resetGame = useCallback(() => {
    window.dispatchEvent(
      new Event(
        "aence-breakout-reset",
      ),
    );
  }, []);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    /* ========================================================
       THEME
    ======================================================== */

    let background = "#f2f0ed";
    let foreground = "#292d32";

    const readTheme = () => {
      const styles =
        getComputedStyle(
          document.documentElement,
        );

      background =
        styles
          .getPropertyValue(
            "--background",
          )
          .trim() ||
        "#f2f0ed";

      foreground =
        styles
          .getPropertyValue(
            "--foreground",
          )
          .trim() ||
        "#292d32";
    };

    readTheme();

    /* ========================================================
       CANVAS SIZE
    ======================================================== */

    let width = 0;
    let height = 0;
    let dpr = 1;

    /* ========================================================
       OFFSCREEN ART CANVAS
    ======================================================== */

    const artCanvas =
      document.createElement(
        "canvas",
      );

    artCanvas.width =
      ART_WIDTH;

    artCanvas.height =
      ART_HEIGHT;

    const artCtx =
      artCanvas.getContext(
        "2d",
      );

    if (!artCtx) {
      return;
    }

    artCtx.imageSmoothingEnabled =
      false;

    /* ========================================================
       IMAGE
    ======================================================== */

    const artImage =
      new Image();

    artImage.decoding =
      "async";

    artImage.src = ART_SRC;

    /* ========================================================
       GAME ARRAYS
    ======================================================== */

    const artCells: ArtCell[] =
      [];

    const balls: Ball[] =
      [];

    const pointBricks: PointBrick[] =
      [];

    const particles: Particle[] =
      [];

    /* ========================================================
       PADDLE
    ======================================================== */

    const paddle = {
      x: 0,
      targetX: 0,
      width: BASE_PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      y: 0,
    };

    /* ========================================================
       KEYBOARD STATE
    ======================================================== */

    const keys = {
      left: false,
      right: false,
    };

    /* ========================================================
       ART POSITION / SCALE
    ======================================================== */

    let artScale = 1;
    let artX = 0;
    let artY = 70;

    /* ========================================================
       DRAW / RECOLOR ORIGINAL ART
    ======================================================== */

    const drawOriginalArt = () => {
      /*
       * First draw the original transparent artwork.
       */
      artCtx.clearRect(
        0,
        0,
        ART_WIDTH,
        ART_HEIGHT,
      );

      artCtx.imageSmoothingEnabled =
        false;

      artCtx.drawImage(
        artImage,
        0,
        0,
        ART_WIDTH,
        ART_HEIGHT,
      );

      /*
       * Get pixel data.
       */
      const imageData =
        artCtx.getImageData(
          0,
          0,
          ART_WIDTH,
          ART_HEIGHT,
        );

      /*
       * Convert the CSS foreground color to RGB.
       */
      const colorCanvas =
        document.createElement(
          "canvas",
        );

      colorCanvas.width = 1;
      colorCanvas.height = 1;

      const colorCtx =
        colorCanvas.getContext(
          "2d",
        );

      if (!colorCtx) {
        return;
      }

      colorCtx.fillStyle =
        foreground;

      colorCtx.fillRect(
        0,
        0,
        1,
        1,
      );

      const rgb =
        colorCtx.getImageData(
          0,
          0,
          1,
          1,
        ).data;

      /*
       * Recolor every visible pixel while
       * preserving its exact alpha.
       *
       * This is what makes the artwork visible
       * in both light and dark mode.
       */
      for (
        let i = 0;
        i <
        imageData.data.length;
        i += 4
      ) {
        if (
          imageData.data[
          i + 3
          ] > 0
        ) {
          imageData.data[i] =
            rgb[0];

          imageData.data[
            i + 1
          ] = rgb[1];

          imageData.data[
            i + 2
          ] = rgb[2];
        }
      }

      artCtx.putImageData(
        imageData,
        0,
        0,
      );
    };

    /* ========================================================
       BUILD DESTRUCTIBLE CELLS
    ======================================================== */

    const buildArtCells = () => {
      artCells.length = 0;

      drawOriginalArt();

      const imageData =
        artCtx.getImageData(
          0,
          0,
          ART_WIDTH,
          ART_HEIGHT,
        );

      for (
        let y = 0;
        y < ART_HEIGHT;
        y += ART_CELL_SIZE
      ) {
        for (
          let x = 0;
          x < ART_WIDTH;
          x += ART_CELL_SIZE
        ) {
          let visible = false;

          for (
            let py = y;
            py <
            Math.min(
              y + ART_CELL_SIZE,
              ART_HEIGHT,
            );
            py++
          ) {
            for (
              let px = x;
              px <
              Math.min(
                x + ART_CELL_SIZE,
                ART_WIDTH,
              );
              px++
            ) {
              const index =
                (py *
                  ART_WIDTH +
                  px) *
                4;

              const alpha =
                imageData.data[
                index + 3
                ];

              if (alpha > 20) {
                visible = true;
                break;
              }
            }

            if (visible) {
              break;
            }
          }

          if (!visible) {
            continue;
          }

          artCells.push({
            x,
            y,
            width: Math.min(
              ART_CELL_SIZE,
              ART_WIDTH - x,
            ),
            height: Math.min(
              ART_CELL_SIZE,
              ART_HEIGHT - y,
            ),
            alive: true,
          });
        }
      }
    };

    /* ========================================================
       RESTORE ART WITHOUT RESURRECTING DESTROYED CELLS
    ======================================================== */

    const redrawArtPreservingDestroyed =
      () => {
        drawOriginalArt();

        /*
         * The offscreen art is recreated in full when the
         * theme changes. Re-clear cells which were already
         * destroyed.
         */
        for (
          const cell of artCells
        ) {
          if (cell.alive) {
            continue;
          }

          artCtx.clearRect(
            cell.x - 1,
            cell.y - 1,
            cell.width + 2,
            cell.height + 2,
          );
        }
      };

    /* ========================================================
       DESTROY SINGLE ART CELL
    ======================================================== */

    const destroyArtCell = (
      cell: ArtCell,
    ) => {
      if (!cell.alive) {
        return;
      }

      cell.alive = false;

      /*
       * Remove it from the artwork.
       */
      artCtx.clearRect(
        cell.x - 1,
        cell.y - 1,
        cell.width + 2,
        cell.height + 2,
      );

      /*
       * Convert local art coordinates into
       * viewport coordinates.
       */
      const worldX =
        artX +
        (cell.x +
          cell.width / 2) *
        artScale;

      const worldY =
        artY +
        (cell.y +
          cell.height / 2) *
        artScale;

      /*
       * Create a falling collectible.
       */
      pointBricks.push({
        x: worldX,
        y: worldY,

        vx: randomBetween(
          -1.2,
          1.2,
        ),

        vy: randomBetween(
          0.5,
          1.8,
        ),

        size: randomBetween(
          2,
          4,
        ),

        rotation:
          randomBetween(
            0,
            Math.PI * 2,
          ),

        rotationVelocity:
          randomBetween(
            -0.11,
            0.11,
          ),
      });

      /*
       * Tiny destruction particles.
       */
      for (
        let i = 0;
        i < 4;
        i++
      ) {
        particles.push({
          x: worldX,
          y: worldY,

          vx: randomBetween(
            -1.5,
            1.5,
          ),

          vy: randomBetween(
            -1.5,
            1.5,
          ),

          size: randomBetween(
            1,
            3,
          ),

          life: 1,
        });
      }
    };

    /* ========================================================
       CREATE BALL
    ======================================================== */

    const createBall = (
      fromPaddle = false,
    ) => {
      const angle =
        randomBetween(
          -2.65,
          -0.5,
        );

      const speed =
        randomBetween(
          BALL_BASE_SPEED *
          0.88,
          BALL_BASE_SPEED *
          1.05,
        );

      balls.push({
        x: fromPaddle
          ? paddle.x +
          paddle.width / 2
          : width / 2,

        y: fromPaddle
          ? paddle.y - 18
          : artY +
          ART_HEIGHT *
          artScale +
          48,

        vx:
          Math.cos(angle) *
          speed,

        vy:
          Math.sin(angle) *
          speed,

        radius:
          width < 700
            ? 5
            : 6,

        trail: [],
      });
    };

    /* ========================================================
       ADD BALL
    ======================================================== */

    const addBall = () => {
      if (
        balls.length >=
        MAX_BALLS
      ) {
        return;
      }

      createBall(true);
    };

    /* ========================================================
       RESIZE
    ======================================================== */

    const resize = () => {
      width =
        window.innerWidth;

      height =
        window.innerHeight;

      dpr =
        Math.min(
          window.devicePixelRatio ||
          1,
          2,
        );

      canvas.width =
        Math.round(
          width * dpr,
        );

      canvas.height =
        Math.round(
          height * dpr,
        );

      canvas.style.width =
        `${width}px`;

      canvas.style.height =
        `${height}px`;

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0,
      );

      /*
       * Desktop:
       * exact reference scale.
       *
       * Smaller devices:
       * scale down proportionally.
       */
      if (width >= 1200) {
        artScale = 1;
      } else {
        artScale = clamp(
          width / 1200,
          0.62,
          1,
        );
      }

      const renderedWidth =
        ART_WIDTH *
        artScale;

      artX =
        width / 2 -
        renderedWidth / 2;

      /*
       * Exact reference top positioning.
       */
      artY =
        width >= 1200
          ? 70
          : Math.max(
            54,
            height * 0.055,
          );

      /*
       * Paddle position.
       */
      paddle.width =
        clamp(
          gameRef.current
            .paddleWidth *
          (width < 700
            ? 0.82
            : 1),
          BASE_PADDLE_WIDTH *
          0.78,
          MAX_PADDLE_WIDTH,
        );

      paddle.y =
        height -
        (width < 700
          ? 62
          : 82);

      paddle.x =
        clamp(
          paddle.x ||
          width / 2 -
          paddle.width / 2,
          0,
          width -
          paddle.width,
        );

      paddle.targetX =
        paddle.x;

      /*
       * Keep balls inside viewport.
       */
      for (
        const ball of balls
      ) {
        ball.x = clamp(
          ball.x,
          ball.radius,
          width -
          ball.radius,
        );

        ball.y = clamp(
          ball.y,
          ball.radius,
          height,
        );
      }
    };

    /* ========================================================
       COLLECT POINT
    ======================================================== */

    const collectPoint = (
      point: PointBrick,
    ) => {
      gameRef.current.caughtPoints++;

      /*
       * Every point slightly increases
       * paddle width.
       */
      gameRef.current.paddleWidth =
        clamp(
          gameRef.current
            .paddleWidth +
          7,
          BASE_PADDLE_WIDTH,
          MAX_PADDLE_WIDTH,
        );

      /*
       * Every 5 collected points:
       * add another ball.
       */
      if (
        gameRef.current
          .caughtPoints >=
        gameRef.current
          .nextBallAt
      ) {
        gameRef.current.nextBallAt +=
          5;

        addBall();
      }

      /*
       * Catch particles.
       */
      for (
        let i = 0;
        i < 5;
        i++
      ) {
        particles.push({
          x: point.x,
          y: paddle.y,

          vx: randomBetween(
            -1,
            1,
          ),

          vy: randomBetween(
            -1.6,
            -0.4,
          ),

          size: randomBetween(
            1,
            3,
          ),

          life: 1,
        });
      }
    };


    /* ========================================================
       KEYBOARD
    ======================================================== */

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      /*
       * Don't steal keyboard input from forms.
       */
      const target =
        event.target as HTMLElement | null;

      if (
        target &&
        (
          target.tagName ===
          "INPUT" ||
          target.tagName ===
          "TEXTAREA" ||
          target.isContentEditable
        )
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          event.preventDefault();
          keys.left = true;
          break;

        case "ArrowRight":
        case "d":
        case "D":
          event.preventDefault();
          keys.right = true;
          break;

        case "r":
        case "R":
          /*
           * Convenient keyboard restart.
           */
          event.preventDefault();
          resetGame();
          break;
      }
    };

    const handleKeyUp = (
      event: KeyboardEvent,
    ) => {
      switch (event.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          keys.left = false;
          break;

        case "ArrowRight":
        case "d":
        case "D":
          keys.right = false;
          break;
      }
    };

    const handleWindowBlur =
      () => {
        keys.left = false;
        keys.right = false;
      };

    /* ========================================================
       BALL / ART COLLISION
    ======================================================== */

    const updateBallArtCollision = (
      ball: Ball,
    ) => {
      for (
        let i = 0;
        i < artCells.length;
        i++
      ) {
        const cell =
          artCells[i];

        if (!cell.alive) {
          continue;
        }

        const worldX =
          artX +
          cell.x *
          artScale;

        const worldY =
          artY +
          cell.y *
          artScale;

        const worldWidth =
          cell.width *
          artScale;

        const worldHeight =
          cell.height *
          artScale;

        const hit =
          circleIntersectsRect(
            ball.x,
            ball.y,
            ball.radius,
            worldX,
            worldY,
            worldWidth,
            worldHeight,
          );

        if (!hit) {
          continue;
        }

        /*
         * Determine reflection direction.
         */
        const centerX =
          worldX +
          worldWidth / 2;

        const centerY =
          worldY +
          worldHeight / 2;

        const dx =
          ball.x -
          centerX;

        const dy =
          ball.y -
          centerY;

        if (
          Math.abs(dx) >
          Math.abs(dy)
        ) {
          ball.vx *= -1;
        } else {
          ball.vy *= -1;
        }

        /*
         * Destroy the exact pixel cell.
         */
        destroyArtCell(
          cell,
        );

        /*
         * Slightly increase speed.
         */
        const speed =
          Math.sqrt(
            ball.vx *
            ball.vx +
            ball.vy *
            ball.vy,
          );

        if (
          speed <
          BALL_MAX_SPEED
        ) {
          const multiplier =
            Math.min(
              1.02,
              BALL_MAX_SPEED /
              Math.max(
                speed,
                0.1,
              ),
            );

          ball.vx *=
            multiplier;

          ball.vy *=
            multiplier;
        }

        /*
         * One cell per ball/frame.
         */
        break;
      }
    };

    /* ========================================================
       UPDATE BALLS
    ======================================================== */

    const updateBalls = () => {
      for (
        let i = 0;
        i < balls.length;
        i++
      ) {
        const ball =
          balls[i];

        /*
         * Trail.
         */
        ball.trail.unshift({
          x: ball.x,
          y: ball.y,
          alpha: 0.18,
        });

        if (
          ball.trail.length >
          6
        ) {
          ball.trail.pop();
        }

        /*
         * Move.
         */
        ball.x += ball.vx;
        ball.y += ball.vy;

        /*
         * Left wall.
         */
        if (
          ball.x -
          ball.radius <=
          0 &&
          ball.vx < 0
        ) {
          ball.x =
            ball.radius;

          ball.vx *= -1;
        }

        /*
         * Right wall.
         */
        if (
          ball.x +
          ball.radius >=
          width &&
          ball.vx > 0
        ) {
          ball.x =
            width -
            ball.radius;

          ball.vx *= -1;
        }

        /*
         * Top wall.
         */
        if (
          ball.y -
          ball.radius <=
          0 &&
          ball.vy < 0
        ) {
          ball.y =
            ball.radius;

          ball.vy *= -1;
        }

        /*
         * Paddle collision.
         */
        if (
          ball.vy > 0 &&
          circleIntersectsRect(
            ball.x,
            ball.y,
            ball.radius,
            paddle.x,
            paddle.y,
            paddle.width,
            paddle.height,
          )
        ) {
          ball.y =
            paddle.y -
            ball.radius -
            1;

          ball.vy =
            -Math.abs(
              ball.vy,
            );

          /*
           * Paddle hit point controls
           * the outgoing horizontal angle.
           */
          const relative =
            (ball.x -
              (paddle.x +
                paddle.width /
                2)) /
            (paddle.width /
              2);

          ball.vx =
            relative * 6.3;

          /*
           * Don't allow a completely vertical
           * loop.
           */
          if (
            Math.abs(
              ball.vx,
            ) < 1
          ) {
            ball.vx =
              ball.vx >= 0
                ? 1
                : -1;
          }
        }

        /*
         * Artwork collision.
         */
        updateBallArtCollision(
          ball,
        );

        /*
         * Ball lost.
         */
        if (
          ball.y -
          ball.radius >
          height
        ) {
          if (
            balls.length > 1
          ) {
            balls.splice(
              i,
              1,
            );

            i--;
          } else {
            /*
             * Never let the game reach zero balls.
             */
            ball.x =
              width / 2;

            ball.y =
              paddle.y - 30;

            const angle =
              randomBetween(
                -2.65,
                -0.5,
              );

            ball.vx =
              Math.cos(angle) *
              BALL_BASE_SPEED;

            ball.vy =
              Math.sin(angle) *
              BALL_BASE_SPEED;
          }
        }
      }
    };

    /* ========================================================
       UPDATE FALLING POINT BRICKS
    ======================================================== */

    const updatePointBricks =
      () => {
        for (
          let i =
            pointBricks.length -
            1;
          i >= 0;
          i--
        ) {
          const point =
            pointBricks[i];

          /*
           * Gravity.
           */
          point.vy +=
            POINT_GRAVITY;

          point.x +=
            point.vx;

          point.y +=
            point.vy;

          point.rotation +=
            point.rotationVelocity;

          /*
           * Paddle catch.
           */
          const caught =
            point.vy > 0 &&
            point.x +
            point.size >
            paddle.x &&
            point.x -
            point.size <
            paddle.x +
            paddle.width &&
            point.y +
            point.size >
            paddle.y &&
            point.y -
            point.size <
            paddle.y +
            paddle.height;

          if (caught) {
            collectPoint(
              point,
            );

            pointBricks.splice(
              i,
              1,
            );

            continue;
          }

          /*
           * Fell out of screen.
           */
          if (
            point.y >
            height + 30
          ) {
            pointBricks.splice(
              i,
              1,
            );
          }
        }
      };

    /* ========================================================
       UPDATE PARTICLES
    ======================================================== */

    const updateParticles =
      () => {
        for (
          let i =
            particles.length -
            1;
          i >= 0;
          i--
        ) {
          const particle =
            particles[i];

          particle.x +=
            particle.vx;

          particle.y +=
            particle.vy;

          particle.vy +=
            0.03;

          particle.life -=
            0.025;

          if (
            particle.life <=
            0
          ) {
            particles.splice(
              i,
              1,
            );
          }
        }
      };

    /* ========================================================
       DRAW BACKGROUND
    ======================================================== */

    const drawBackground =
      () => {
        ctx.fillStyle =
          background;

        ctx.fillRect(
          0,
          0,
          width,
          height,
        );
      };

    /* ========================================================
       DRAW ART
    ======================================================== */

    const drawArt = () => {
      ctx.save();

      /*
       * Preserve the reference's pixelated appearance.
       */
      ctx.imageSmoothingEnabled =
        false;

      ctx.drawImage(
        artCanvas,
        artX,
        artY,
        ART_WIDTH *
        artScale,
        ART_HEIGHT *
        artScale,
      );

      ctx.restore();
    };

    /* ========================================================
       DRAW POINT BRICKS
    ======================================================== */

    const drawPointBricks =
      () => {
        for (
          const point of
          pointBricks
        ) {
          ctx.save();

          ctx.translate(
            point.x,
            point.y,
          );

          ctx.rotate(
            point.rotation,
          );

          ctx.fillStyle =
            foreground;

          ctx.fillRect(
            -point.size / 2,
            -point.size / 2,
            point.size,
            point.size,
          );

          ctx.restore();
        }
      };

    /* ========================================================
       DRAW PARTICLES
    ======================================================== */

    const drawParticles =
      () => {
        for (
          const particle of
          particles
        ) {
          ctx.globalAlpha =
            particle.life;

          ctx.fillStyle =
            foreground;

          ctx.fillRect(
            particle.x,
            particle.y,
            particle.size,
            particle.size,
          );
        }

        ctx.globalAlpha = 1;
      };

    /* ========================================================
       DRAW BALLS
    ======================================================== */

    const drawBalls = () => {
      for (
        const ball of balls
      ) {
        /*
         * Tiny motion trail.
         */
        for (
          let i = 0;
          i <
          ball.trail.length;
          i++
        ) {
          const trail =
            ball.trail[i];

          ctx.globalAlpha =
            trail.alpha *
            (1 -
              i /
              ball.trail.length);

          ctx.fillStyle =
            foreground;

          ctx.beginPath();

          ctx.arc(
            trail.x,
            trail.y,
            Math.max(
              1,
              ball.radius *
              (1 -
                i /
                (ball.trail.length +
                  1)),
            ),
            0,
            Math.PI * 2,
          );

          ctx.fill();
        }

        ctx.globalAlpha = 1;

        /*
         * Main ball.
         */
        ctx.fillStyle =
          foreground;

        ctx.beginPath();

        ctx.arc(
          ball.x,
          ball.y,
          ball.radius,
          0,
          Math.PI * 2,
        );

        ctx.fill();
      }
    };

    /* ========================================================
       DRAW PADDLE
    ======================================================== */

    const drawPaddle = () => {
      /*
       * Paddle follows keyboard target.
       */
      if (keys.left) {
        paddle.targetX -=
          KEYBOARD_SPEED;
      }

      if (keys.right) {
        paddle.targetX +=
          KEYBOARD_SPEED;
      }

      /*
       * Keep keyboard target inside viewport.
       */
      paddle.targetX =
        clamp(
          paddle.targetX,
          0,
          width -
          paddle.width,
        );

      /*
       * Smooth movement.
       */
      paddle.x +=
        (paddle.targetX -
          paddle.x) *
        0.18;

      paddle.x =
        clamp(
          paddle.x,
          0,
          width -
          paddle.width,
        );

      ctx.fillStyle =
        foreground;

      roundedRect(
        ctx,
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height,
        5,
      );

      ctx.fill();
    };

    /* ========================================================
       DRAW COMBO
    ======================================================== */

    const drawCombo = () => {
      /*
       * Tiny reference-style counter.
       */
      ctx.save();

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "top";

      ctx.font =
        "10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

      ctx.fillStyle =
        foreground;

      ctx.globalAlpha = 0.9;

      ctx.fillText(
        `COMBO × ${gameRef.current.caughtPoints}`,
        width / 2,
        16,
      );

      ctx.restore();
    };

    /* ========================================================
       RESET GAME
    ======================================================== */

    const reset = () => {
      gameRef.current = {
        caughtPoints: 0,
        nextBallAt: 5,
        paddleWidth:
          BASE_PADDLE_WIDTH,
      };

      balls.length = 0;
      pointBricks.length = 0;
      particles.length = 0;

      paddle.width =
        BASE_PADDLE_WIDTH;

      paddle.x =
        width / 2 -
        paddle.width / 2;

      paddle.targetX =
        paddle.x;

      /*
       * Restore exact artwork.
       */
      buildArtCells();

      /*
       * Start one ball.
       */
      createBall(false);
    };

    /* ========================================================
       MAIN ANIMATION LOOP
    ======================================================== */

    let previousTime =
      performance.now();

    const animate = (
      currentTime: number,
    ) => {
      const delta =
        Math.min(
          currentTime -
          previousTime,
          32,
        );

      previousTime =
        currentTime;

      /*
       * Kept for future frame-rate normalization.
       */
      void delta;

      updateBalls();
      updatePointBricks();
      updateParticles();

      /*
       * Render order.
       */
      drawBackground();
      drawArt();
      drawPointBricks();
      drawParticles();
      drawBalls();
      drawPaddle();
      drawCombo();

      animationFrameRef.current =
        requestAnimationFrame(
          animate,
        );
    };

    /* ========================================================
       THEME OBSERVER
    ======================================================== */

    const themeObserver =
      new MutationObserver(() => {
        readTheme();

        /*
         * Recolor artwork but preserve all destroyed
         * cells instead of bringing them back.
         */
        redrawArtPreservingDestroyed();
      });

    themeObserver.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "class",
        ],
      },
    );

    /* ========================================================
       EVENT HANDLERS
    ======================================================== */

    const handleResize = () => {
      resize();
    };

    const handleReset = () => {
      reset();
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    window.addEventListener(
      "aence-breakout-reset",
      handleReset,
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "keyup",
      handleKeyUp,
    );

    window.addEventListener(
      "blur",
      handleWindowBlur,
    );

    /* ========================================================
       START GAME
    ======================================================== */

    let started = false;

    const startGame = () => {
      if (started) {
        return;
      }

      started = true;

      resize();

      /*
       * The artwork must be fully loaded before
       * we inspect alpha pixels.
       */
      buildArtCells();

      /*
       * One starting ball.
       */
      createBall(false);

      animationFrameRef.current =
        requestAnimationFrame(
          animate,
        );
    };

    /*
     * Cached image.
     */
    if (
      artImage.complete &&
      artImage.naturalWidth > 0
    ) {
      startGame();
    } else {
      artImage.onload =
        startGame;
    }

    artImage.onerror = () => {
      console.error(
        `[AENCE 404] Could not load ${ART_SRC}`,
      );
    };

    /* ========================================================
       CLEANUP
    ======================================================== */

    return () => {
      themeObserver.disconnect();

      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }

      window.removeEventListener(
        "resize",
        handleResize,
      );

      window.removeEventListener(
        "aence-breakout-reset",
        handleReset,
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.removeEventListener(
        "keyup",
        handleKeyUp,
      );

      window.removeEventListener(
        "blur",
        handleWindowBlur,
      );

    };
  }, [resetGame]);

  return (
    <main
      className="
        relative
        min-h-screen
        w-full
        overflow-hidden
        bg-background
        text-foreground
        select-none
      "
    >
      {/* ======================================================
          AENCE
      ======================================================= */}

      <div
        className="
          absolute
          left-6
          top-6.5
          z-50
          text-[16px]
          font-medium
          leading-none
          tracking-widest
        "
      >
        TOOLKIT
      </div>

      {/* ======================================================
          TOP NAVIGATION
      ======================================================= */}

      <nav
        className="
          absolute
          right-6
          top-7
          z-50
          flex
          items-center
          gap-7.5
          text-[10px]
          font-medium
          uppercase
          tracking-[-0.01em]
          sm:right-6.5
          sm:gap-8.5
          sm:text-[11px]
        "
      >
        <a
          href="#"
          className="
            transition-opacity
            hover:opacity-50
            tracking-wider
          "
        >
          HOME
        </a>

        <a
          href="#"
          className="
            transition-opacity
            hover:opacity-50
            tracking-wider
          "
        >
          POLICY
        </a>

        <a
          href="#"
          className="
            transition-opacity
            hover:opacity-50
            tracking-wider
          "
        >
          CONTACT
        </a>

        <a
          href="#"
          className="
            transition-opacity
            hover:opacity-50
            tracking-wider
          "
        >
          SIGN IN
        </a>
      </nav>

      {/* ======================================================
          GAME CANVAS
      ======================================================= */}

      <canvas
        ref={canvasRef}
        className="
        pointer-events-none
        absolute
        inset-0
        z-10
        h-full
        w-full
      "
        aria-label="Interactive 404 breakout game"
      />

      {/* ======================================================
          MIGHT AS WELL PLAY
      ======================================================= */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[53.4%]
          z-30
          -translate-x-1/2
          text-center
        "
      >
        <div
          className="
            mb-1
            text-[14px]
            leading-none
          "
        >
          •
        </div>

        <div
          className="
            whitespace-nowrap
            text-[11px]
            font-medium
            tracking-widest
            my-20
          "
        >
          ( TOOLKIT PONG GAME )
        </div>
      </div>

      {/* ======================================================
          HIDDEN RESTART BUTTON
          
          Keyboard R also restarts the game.
      ======================================================= */}

      <button
        type="button"
        onClick={resetGame}
        aria-label="Restart game"
        className="
          absolute
          bottom-5
          right-5
          z-50
          h-8
          w-20
          opacity-0
          focus:opacity-100
        "
      >
        Restart
      </button>
    </main>
  );
}