// Root configuration for matrix dimensions, frame rate, and connection settings used by the Pi runtime.
export default {
    matrix: { width: 49, height: 39 },
    fps: 30,
    serial: {
        enabled: true,
        path: "/dev/ttyACM0", // update for the actual device path
        baudRate: 115200,
    },
    sinks: {
        simulator: {
            enabled: true,
            screen: "laptop",
            ratio_factors: {
                laptop: 130,
                tv: 70,
            },
            virtualPort: {
                enabled: true,
                path: "/dev/ttys032"
            }
        }
    }
};