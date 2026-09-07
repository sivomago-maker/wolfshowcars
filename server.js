require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");

const { createClient } = require("@supabase/supabase-js");

const {
    MercadoPagoConfig,
    Preference
} = require("mercadopago");

const app = express();

app.disable("x-powered-by");

// =====================================================
// CONFIGURACIÓN
// =====================================================

const PORT =
    Number(process.env.PORT) || 3000;

const URL_PUBLICA =
    (
        process.env.PUBLIC_URL ||
        `http://localhost:${PORT}`
    ).replace(/\/+$/, "");

// =====================================================
// VARIABLES DE ENTORNO
// =====================================================

const variablesObligatorias = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "MP_ACCESS_TOKEN",
    "MP_WEBHOOK_SECRET"
];

const variablesFaltantes =
    variablesObligatorias.filter(
        function (variable) {
            return !process.env[variable];
        }
    );

if (variablesFaltantes.length > 0) {

    console.error(
        "=========================================="
    );

    console.error(
        "ERROR: FALTAN VARIABLES DE ENTORNO"
    );

    console.error(
        variablesFaltantes
    );

    console.error(
        "=========================================="
    );

    process.exit(1);
}

// =====================================================
// SUPABASE
// =====================================================

const supabase =
    createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

// =====================================================
// MERCADO PAGO
// =====================================================

const mpClient =
    new MercadoPagoConfig({
        accessToken:
            process.env.MP_ACCESS_TOKEN
    });

const preferenceClient =
    new Preference(mpClient);

// =====================================================
// PRECIOS
// =====================================================

const PRECIO_AUTO = 12000;

const PRECIO_ACOMPANANTE = 3000;

const MAX_ACOMPANANTES = 50;

// =====================================================
// EXPRESS
// =====================================================

app.use(
    express.json({
        limit: "100kb"
    })
);

// =====================================================
// CORS
// =====================================================

app.use(
    function (req, res, next) {

        const origenPermitido =
            process.env.ALLOWED_ORIGIN || "*";

        res.header(
            "Access-Control-Allow-Origin",
            origenPermitido
        );

        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept"
        );

        res.header(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        );

        if (
            req.method === "OPTIONS"
        ) {

            return res.sendStatus(204);
        }

        next();
    }
);

// =====================================================
// LOG DE PETICIONES
// =====================================================

app.use(
    function (req, res, next) {

        console.log(
            "REQUEST:",
            req.method,
            req.originalUrl,
            "Origin:",
            req.headers.origin || "-"
        );

        next();
    }
);

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function texto(valor) {

    return String(
        valor ?? ""
    ).trim();
}

// -----------------------------------------------------

function normalizarInstagram(valor) {

    let instagram =
        texto(valor);

    if (
        instagram === ""
    ) {

        return "";
    }

    instagram =
        instagram.replace(
            /^@+/,
            ""
        );

    return "@" + instagram;
}

// -----------------------------------------------------

function normalizarPatente(valor) {

    return texto(valor)
        .replace(
            /[\s-]/g,
            ""
        )
        .toUpperCase();
}

// -----------------------------------------------------

function validarDNI(dni) {

    return /^\d{7,8}$/.test(
        dni
    );
}

// -----------------------------------------------------

function validarAnio(anio) {

    if (
        !/^\d{4}$/.test(anio)
    ) {

        return false;
    }

    const numero =
        Number(anio);

    return (
        numero >= 1900 &&
        numero <= 2027
    );
}

// -----------------------------------------------------

function validarPatente(patente) {

    return /^[A-Z0-9]{5,8}$/.test(
        patente
    );
}

// =====================================================
// GENERAR NÚMERO DE ACREDITACIÓN
// =====================================================

function generarNumeroAcreditacion() {

    const numero =
        crypto.randomInt(
            100000,
            1000000
        );

    return (
        "WSC27-" +
        numero
    );
}

// =====================================================
// GENERAR CÓDIGO DE SEGURIDAD
// =====================================================

function generarCodigoSeguridad() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo = "";

    for (
        let i = 0;
        i < 10;
        i++
    ) {

        const posicion =
            crypto.randomInt(
                0,
                caracteres.length
            );

        codigo +=
            caracteres.charAt(
                posicion
            );
    }

    return codigo;
}

// =====================================================
// GENERAR ACREDITACIÓN ÚNICA
// =====================================================

async function obtenerNumeroDisponible() {

    for (
        let intento = 0;
        intento < 10;
        intento++
    ) {

        const numero =
            generarNumeroAcreditacion();

        const {
            data,
            error
        } =
            await supabase
                .from("acreditaciones")
                .select("id")
                .eq(
                    "numero_acreditacion",
                    numero
                )
                .maybeSingle();

        if (error) {

            console.error(
                "ERROR COMPROBANDO NÚMERO:",
                error
            );

            throw error;
        }

        if (!data) {

            return numero;
        }
    }

    throw new Error(
        "No se pudo generar un número de acreditación disponible."
    );
}

// =====================================================
// VALIDAR FIRMA WEBHOOK MERCADO PAGO
// =====================================================

function validarFirmaWebhookMercadoPago(
    req,
    dataId
) {

    const secret =
        process.env.MP_WEBHOOK_SECRET;

    if (
        !secret
    ) {

        throw new Error(
            "MP_WEBHOOK_SECRET no está configurado."
        );
    }

    const xSignature =
        texto(
            req.headers["x-signature"]
        );

    const xRequestId =
        texto(
            req.headers["x-request-id"]
        );

    if (
        !xSignature
    ) {

        return {
            valida: false,
            motivo:
                "Falta el header x-signature."
        };
    }

    if (
        !xRequestId
    ) {

        return {
            valida: false,
            motivo:
                "Falta el header x-request-id."
        };
    }

    if (
        !dataId
    ) {

        return {
            valida: false,
            motivo:
                "Falta data.id."
        };
    }

    // =================================================
    // EXTRAER ts Y v1
    // =================================================

    const partes =
        xSignature.split(",");

    let timestamp = null;

    const firmas = [];

    for (
        const parte
        of partes
    ) {

        const indice =
            parte.indexOf("=");

        if (
            indice === -1
        ) {

            continue;
        }

        const clave =
            parte
                .slice(0, indice)
                .trim();

        const valor =
            parte
                .slice(indice + 1)
                .trim();

        if (
            clave === "ts"
        ) {

            timestamp =
                valor;
        }

        if (
            clave === "v1"
        ) {

            firmas.push(
                valor
            );
        }
    }

    if (
        !timestamp ||
        firmas.length === 0
    ) {

        return {
            valida: false,
            motivo:
                "La firma x-signature no contiene ts y v1 válidos."
        };
    }

    // =================================================
    // VALIDAR TIMESTAMP
    // =================================================

    const timestampNumero =
        Number(timestamp);

    if (
        !Number.isSafeInteger(
            timestampNumero
        )
    ) {

        return {
            valida: false,
            motivo:
                "Timestamp inválido."
        };
    }

    // =================================================
    // MANIFEST SEGÚN MERCADO PAGO
    // =================================================

    const manifest =
        "id:" +
        dataId +
        ";request-id:" +
        xRequestId +
        ";ts:" +
        timestamp +
        ";";

    // =================================================
    // HMAC SHA-256
    // =================================================

    const firmaCalculada =
        crypto
            .createHmac(
                "sha256",
                secret
            )
            .update(
                manifest
            )
            .digest("hex");

    // =================================================
    // COMPARAR FIRMAS DE FORMA SEGURA
    // =================================================

    const firmaCalculadaBuffer =
        Buffer.from(
            firmaCalculada,
            "utf8"
        );

    for (
        const firmaRecibida
        of firmas
    ) {

        const firmaRecibidaBuffer =
            Buffer.from(
                firmaRecibida,
                "utf8"
            );

        if (
            firmaRecibidaBuffer.length !==
            firmaCalculadaBuffer.length
        ) {

            continue;
        }

        if (
            crypto.timingSafeEqual(
                firmaRecibidaBuffer,
                firmaCalculadaBuffer
            )
        ) {

            return {
                valida: true,
                motivo:
                    "Firma válida."
            };
        }
    }

    return {
        valida: false,
        motivo:
            "La firma HMAC no coincide."
    };
}

// =====================================================
// API — CREAR ACREDITACIÓN
// =====================================================

app.post(
    "/api/acreditaciones",
    async function (req, res) {

        try {

            console.log(
                "=========================================="
            );

            console.log(
                "NUEVA ACREDITACIÓN"
            );

            const datos =
                req.body || {};

            const nombre =
                texto(datos.nombre);

            const dni =
                texto(datos.dni)
                    .replace(
                        /\D/g,
                        ""
                    );

            const telefono =
                texto(datos.telefono);

            const instagram =
                normalizarInstagram(
                    datos.instagram
                );

            const marca =
                texto(datos.marca);

            const modelo =
                texto(datos.modelo);

            const anio =
                texto(datos.anio);

            const patente =
                normalizarPatente(
                    datos.patente
                );

            const acompanantes =
                Number(
                    datos.acompanantes || 0
                );

            const campos =
                {
                    nombre,
                    dni,
                    telefono,
                    instagram,
                    marca,
                    modelo,
                    anio,
                    patente
                };

            for (
                const campo
                of Object.keys(campos)
            ) {

                if (
                    campos[campo] === ""
                ) {

                    return res
                        .status(400)
                        .json({

                            ok: false,

                            mensaje:
                                "Falta completar el campo: " +
                                campo

                        });
                }
            }

            if (
                !validarDNI(dni)
            ) {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        mensaje:
                            "El DNI debe contener entre 7 y 8 números."

                    });
            }

            if (
                !validarAnio(anio)
            ) {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        mensaje:
                            "El año del vehículo no es válido."

                    });
            }

            if (
                !validarPatente(patente)
            ) {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        mensaje:
                            "La patente no tiene un formato válido."

                    });
            }

            if (
                !Number.isInteger(
                    acompanantes
                ) ||
                acompanantes < 0 ||
                acompanantes > MAX_ACOMPANANTES
            ) {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        mensaje:
                            "La cantidad de acompañantes no es válida."

                    });
            }

            const total =
                PRECIO_AUTO +
                (
                    acompanantes *
                    PRECIO_ACOMPANANTE
                );

            const numeroAcreditacion =
                await obtenerNumeroDisponible();

            const codigoSeguridad =
                generarCodigoSeguridad();

            const {
                data,
                error
            } =
                await supabase
                    .from("acreditaciones")
                    .insert([
                        {

                            numero_acreditacion:
                                numeroAcreditacion,

                            codigo_seguridad:
                                codigoSeguridad,

                            nombre:
                                nombre,

                            dni:
                                dni,

                            telefono:
                                telefono,

                            instagram:
                                instagram,

                            marca:
                                marca,

                            modelo:
                                modelo,

                            anio:
                                anio,

                            patente:
                                patente,

                            acompanantes:
                                acompanantes,

                            precio_auto:
                                PRECIO_AUTO,

                            precio_acompanante:
                                PRECIO_ACOMPANANTE,

                            total:
                                total,

                            estado:
                                "PENDIENTE_PAGO"

                        }
                    ])
                    .select()
                    .single();

            if (error) {

                console.error(
                    "ERROR SUPABASE:",
                    error
                );

                return res
                    .status(500)
                    .json({

                        ok: false,

                        mensaje:
                            "No se pudo guardar la acreditación en la base de datos."

                    });
            }

            const acreditacion = {

                id:
                    data.id,

                numeroAcreditacion:
                    numeroAcreditacion,

                codigoSeguridad:
                    codigoSeguridad,

                datos: {

                    nombre,
                    dni,
                    telefono,
                    instagram,
                    marca,
                    modelo,
                    anio,
                    patente,
                    acompanantes

                },

                precioAuto:
                    PRECIO_AUTO,

                precioAcompanante:
                    PRECIO_ACOMPANANTE,

                total,

                estado:
                    "PENDIENTE_PAGO"

            };

            console.log(
                "ACREDITACIÓN CREADA:",
                numeroAcreditacion
            );

            console.log(
                "ID:",
                data.id
            );

            console.log(
                "TOTAL:",
                total
            );

            console.log(
                "=========================================="
            );

            return res
                .status(201)
                .json({

                    ok: true,

                    mensaje:
                        "Acreditación creada correctamente.",

                    acreditacion

                });

        } catch (error) {

            console.error(
                "ERROR GENERAL:",
                error
            );

            return res
                .status(500)
                .json({

                    ok: false,

                    mensaje:
                        "Ocurrió un error interno en el servidor."

                });
        }
    }
);

// =====================================================
// API — CREAR PREFERENCIA MERCADO PAGO
// =====================================================

app.post(
    "/api/mercadopago/preferencia",
    async function (req, res) {

        try {

            console.log(
                "=========================================="
            );

            console.log(
                "CREANDO PREFERENCIA MERCADO PAGO"
            );

            const acreditacionId =
                texto(
                    req.body?.acreditacionId
                );

            const numeroAcreditacion =
                texto(
                    req.body?.numeroAcreditacion
                );

            if (
                !acreditacionId ||
                !numeroAcreditacion
            ) {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        mensaje:
                            "Faltan datos para crear el pago."

                    });
            }

            const {
                data: acreditacionBD,
                error: errorBusqueda
            } =
                await supabase
                    .from("acreditaciones")
                    .select("*")
                    .eq(
                        "id",
                        acreditacionId
                    )
                    .eq(
                        "numero_acreditacion",
                        numeroAcreditacion
                    )
                    .single();

            if (
                errorBusqueda ||
                !acreditacionBD
            ) {

                console.error(
                    "ERROR BUSCANDO ACREDITACIÓN:",
                    errorBusqueda
                );

                return res
                    .status(404)
                    .json({

                        ok: false,

                        mensaje:
                            "No se encontró la acreditación."

                    });
            }

            if (
                acreditacionBD.estado !==
                "PENDIENTE_PAGO"
            ) {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        mensaje:
                            "Esta acreditación no está disponible para pago."

                    });
            }

            const totalReal =
                Number(
                    acreditacionBD.total
                );

            if (
                !Number.isFinite(
                    totalReal
                ) ||
                totalReal <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        mensaje:
                            "El importe de la acreditación no es válido."

                    });
            }

            const preference =
                await preferenceClient.create({

                    body: {

                        items: [

                            {

                                id:
                                    String(
                                        acreditacionBD.id
                                    ),

                                title:
                                    "WOLF SHOWCARS 2027 - Acreditación " +
                                    acreditacionBD.numero_acreditacion,

                                quantity: 1,

                                currency_id:
                                    "ARS",

                                unit_price:
                                    totalReal

                            }

                        ],

                        external_reference:
                            acreditacionBD.numero_acreditacion,

                        metadata: {

                            acreditacion_id:
                                String(
                                    acreditacionBD.id
                                ),

                            numero_acreditacion:
                                acreditacionBD.numero_acreditacion

                        },

                        back_urls: {

                            success:
                                URL_PUBLICA +
                                "/pago-exitoso.html",

                            failure:
                                URL_PUBLICA +
                                "/pago-fallido.html",

                            pending:
                                URL_PUBLICA +
                                "/pago-pendiente.html"

                        },

                        auto_return:
                            "approved",

                        notification_url:
                            URL_PUBLICA +
                            "/api/mercadopago/webhook"

                    }

                });

            console.log(
                "PREFERENCIA CREADA:"
            );

            console.log(
                "ID:",
                preference.id
            );

            console.log(
                "ACREDITACIÓN:",
                acreditacionBD.numero_acreditacion
            );

            console.log(
                "TOTAL:",
                totalReal
            );

            console.log(
                "=========================================="
            );

            return res
                .status(201)
                .json({

                    ok: true,

                    preferenceId:
                        preference.id,

                    initPoint:
                        preference.init_point,

                    sandboxInitPoint:
                        preference.sandbox_init_point ||
                        null

                });

        } catch (error) {

            console.error(
                "ERROR MERCADO PAGO:",
                error
            );

            return res
                .status(500)
                .json({

                    ok: false,

                    mensaje:
                        "No se pudo crear el pago de Mercado Pago.",

                    error:
                        error.message

                });
        }
    }
);

// =====================================================
// WEBHOOK MERCADO PAGO
// =====================================================

app.post(
    "/api/mercadopago/webhook",
    async function (req, res) {

        console.log(
            "=========================================="
        );

        console.log(
            "WEBHOOK MERCADO PAGO RECIBIDO"
        );

        const body =
            req.body || {};

        const tipo =
            texto(
                body.type ||
                req.query.type
            );

        const dataId =
            texto(
                req.query["data.id"]
            );

        console.log(
            "Tipo:",
            tipo
        );

        console.log(
            "Data ID:",
            dataId
        );

        // =================================================
        // VALIDAR FIRMA ANTES DE PROCESAR
        // =================================================

        try {

            const resultadoFirma =
                validarFirmaWebhookMercadoPago(
                    req,
                    dataId
                );

            if (
                !resultadoFirma.valida
            ) {

                console.error(
                    "WEBHOOK RECHAZADO:"
                );

                console.error(
                    resultadoFirma.motivo
                );

                return res
                    .status(401)
                    .json({

                        ok: false,

                        mensaje:
                            "Firma de webhook inválida."

                    });
            }

            console.log(
                "Firma webhook: VÁLIDA"
            );

        } catch (error) {

            console.error(
                "ERROR VALIDANDO FIRMA WEBHOOK:",
                error
            );

            return res
                .status(500)
                .json({

                    ok: false,

                    mensaje:
                        "No se pudo validar la firma del webhook."

                });
        }

        // =================================================
        // RESPUESTA RÁPIDA A MERCADO PAGO
        // =================================================

        res
            .status(200)
            .json({
                ok: true
            });

        // =================================================
        // PROCESAMIENTO
        // =================================================

        try {

            // =================================================
            // SOLO PROCESAMOS PAGOS
            // =================================================

            if (
                tipo !== "payment"
            ) {

                console.log(
                    "Notificación ignorada. Tipo:",
                    tipo
                );

                return;
            }

            if (
                !dataId
            ) {

                console.error(
                    "Webhook sin data.id."
                );

                return;
            }

            // =================================================
            // CONSULTAR PAGO REAL A MERCADO PAGO
            // =================================================

            const paymentResponse =
                await fetch(
                    "https://api.mercadopago.com/v1/payments/" +
                    encodeURIComponent(
                        dataId
                    ),
                    {

                        method:
                            "GET",

                        headers: {

                            Authorization:
                                "Bearer " +
                                process.env.MP_ACCESS_TOKEN,

                            Accept:
                                "application/json"

                        }

                    }
                );

            if (
                !paymentResponse.ok
            ) {

                console.error(
                    "ERROR CONSULTANDO PAGO:"
                );

                console.error(
                    "HTTP:",
                    paymentResponse.status
                );

                console.error(
                    await paymentResponse.text()
                );

                return;
            }

            const payment =
                await paymentResponse.json();

            console.log(
                "PAYMENT ID:",
                payment.id
            );

            console.log(
                "ESTADO:",
                payment.status
            );

            console.log(
                "STATUS DETAIL:",
                payment.status_detail
            );

            console.log(
                "EXTERNAL REFERENCE:",
                payment.external_reference
            );

            console.log(
                "IMPORTE:",
                payment.transaction_amount
            );

            console.log(
                "MONEDA:",
                payment.currency_id
            );

            // =================================================
            // SOLO PRODUCCIÓN
            // =================================================

            if (
                payment.live_mode !== true
            ) {

                console.error(
                    "Pago rechazado: no corresponde a una operación de producción."
                );

                return;
            }

            // =================================================
            // SOLO APROBADOS
            // =================================================

            if (
                payment.status !==
                "approved"
            ) {

                console.log(
                    "Pago todavía no aprobado:",
                    payment.status
                );

                return;
            }

            // =================================================
            // VALIDAR MONEDA
            // =================================================

            if (
                payment.currency_id !==
                "ARS"
            ) {

                console.error(
                    "Pago rechazado: moneda inválida:",
                    payment.currency_id
                );

                return;
            }

            // =================================================
            // OBTENER REFERENCIA
            // =================================================

            const numeroAcreditacion =
                texto(
                    payment.external_reference
                );

            if (
                !numeroAcreditacion
            ) {

                console.error(
                    "Pago rechazado: falta external_reference."
                );

                return;
            }

            // =================================================
            // BUSCAR ACREDITACIÓN
            // =================================================

            const {
                data: acreditacion,
                error: errorBusqueda
            } =
                await supabase
                    .from("acreditaciones")
                    .select("*")
                    .eq(
                        "numero_acreditacion",
                        numeroAcreditacion
                    )
                    .maybeSingle();

            if (
                errorBusqueda
            ) {

                console.error(
                    "ERROR BUSCANDO ACREDITACIÓN:",
                    errorBusqueda
                );

                return;
            }

            if (
                !acreditacion
            ) {

                console.error(
                    "NO SE ENCONTRÓ LA ACREDITACIÓN:",
                    numeroAcreditacion
                );

                return;
            }

            // =================================================
            // VALIDAR METADATA
            // =================================================

            if (
                payment.metadata
            ) {

                const metadataId =
                    texto(
                        payment.metadata.acreditacion_id
                    );

                const metadataNumero =
                    texto(
                        payment.metadata.numero_acreditacion
                    );

                if (
                    metadataId &&
                    metadataId !==
                    String(
                        acreditacion.id
                    )
                ) {

                    console.error(
                        "Pago rechazado: metadata.acreditacion_id no coincide."
                    );

                    return;
                }

                if (
                    metadataNumero &&
                    metadataNumero !==
                    acreditacion.numero_acreditacion
                ) {

                    console.error(
                        "Pago rechazado: metadata.numero_acreditacion no coincide."
                    );

                    return;
                }
            }

            // =================================================
            // VALIDAR IMPORTE
            // =================================================

            const importeMercadoPago =
                Number(
                    payment.transaction_amount
                );

            const importeAcreditacion =
                Number(
                    acreditacion.total
                );

            if (
                !Number.isFinite(
                    importeMercadoPago
                ) ||
                !Number.isFinite(
                    importeAcreditacion
                )
            ) {

                console.error(
                    "Pago rechazado: importe inválido."
                );

                return;
            }

            if (
                importeMercadoPago !==
                importeAcreditacion
            ) {

                console.error(
                    "=========================================="
                );

                console.error(
                    "ALERTA: IMPORTE NO COINCIDE"
                );

                console.error(
                    "Mercado Pago:",
                    importeMercadoPago
                );

                console.error(
                    "Supabase:",
                    importeAcreditacion
                );

                console.error(
                    "=========================================="
                );

                return;
            }

            // =================================================
            // VERIFICAR SI PAYMENT ID YA FUE UTILIZADO
            // =================================================

            const {
                data: pagoExistente,
                error: errorPagoExistente
            } =
                await supabase
                    .from("acreditaciones")
                    .select(
                        "id, numero_acreditacion, estado"
                    )
                    .eq(
                        "mercado_pago_payment_id",
                        String(
                            payment.id
                        )
                    )
                    .maybeSingle();

            if (
                errorPagoExistente
            ) {

                console.error(
                    "ERROR COMPROBANDO PAYMENT ID:",
                    errorPagoExistente
                );

                return;
            }

            if (
                pagoExistente &&
                pagoExistente.id !==
                acreditacion.id
            ) {

                console.error(
                    "ALERTA: PAYMENT ID YA UTILIZADO EN OTRA ACREDITACIÓN."
                );

                console.error(
                    "Payment ID:",
                    payment.id
                );

                console.error(
                    "Acreditación actual:",
                    acreditacion.numero_acreditacion
                );

                console.error(
                    "Acreditación anterior:",
                    pagoExistente.numero_acreditacion
                );

                return;
            }

            // =================================================
            // IDEMPOTENCIA
            // =================================================

            if (
                acreditacion.estado ===
                "PAGADO"
            ) {

                console.log(
                    "El pago ya estaba registrado."
                );

                console.log(
                    "Acreditación:",
                    acreditacion.numero_acreditacion
                );

                return;
            }

            // =================================================
            // SOLO PENDIENTE DE PAGO
            // =================================================

            if (
                acreditacion.estado !==
                "PENDIENTE_PAGO"
            ) {

                console.error(
                    "La acreditación no está pendiente de pago."
                );

                console.error(
                    "Estado actual:",
                    acreditacion.estado
                );

                return;
            }

            // =================================================
            // ACTUALIZAR SUPABASE
            // =================================================

            const {
                data: actualizada,
                error: errorActualizacion
            } =
                await supabase
                    .from("acreditaciones")
                    .update({

                        estado:
                            "PAGADO",

                        mercado_pago_payment_id:
                            String(
                                payment.id
                            )

                    })
                    .eq(
                        "id",
                        acreditacion.id
                    )
                    .eq(
                        "estado",
                        "PENDIENTE_PAGO"
                    )
                    .select()
                    .maybeSingle();

            if (
                errorActualizacion
            ) {

                console.error(
                    "ERROR ACTUALIZANDO SUPABASE:"
                );

                console.error(
                    errorActualizacion
                );

                return;
            }

            // =================================================
            // CONTROL DE ACTUALIZACIÓN
            // =================================================

            if (
                !actualizada
            ) {

                console.log(
                    "La acreditación pudo haber sido procesada simultáneamente."
                );

                return;
            }

            // =================================================
            // PAGO CONFIRMADO
            // =================================================

            console.log(
                "=========================================="
            );

            console.log(
                "PAGO CONFIRMADO"
            );

            console.log(
                "ACREDITACIÓN:",
                numeroAcreditacion
            );

            console.log(
                "PAYMENT ID:",
                payment.id
            );

            console.log(
                "TOTAL:",
                payment.transaction_amount
            );

            console.log(
                "SUPABASE:",
                actualizada.estado
            );

            console.log(
                "=========================================="
            );

        } catch (error) {

            console.error(
                "ERROR PROCESANDO WEBHOOK:",
                error
            );
        }
    }
);

// =====================================================
// API — CONSULTAR ESTADO DE ACREDITACIÓN
// =====================================================

app.get(
    "/api/acreditaciones/:numero/estado",
    async function (req, res) {

        try {

            const numero =
                texto(
                    req.params.numero
                );

            if (
                !numero
            ) {

                return res
                    .status(400)
                    .json({

                        ok: false,

                        mensaje:
                            "Número de acreditación inválido."

                    });
            }

            const {
                data,
                error
            } =
                await supabase
                    .from("acreditaciones")
                    .select(
                        `
                        numero_acreditacion,
                        estado,
                        marca,
                        modelo,
                        anio,
                        patente,
                        acompanantes,
                        total
                        `
                    )
                    .eq(
                        "numero_acreditacion",
                        numero
                    )
                    .maybeSingle();

            if (
                error
            ) {

                console.error(
                    "ERROR CONSULTANDO ESTADO:",
                    error
                );

                return res
                    .status(500)
                    .json({

                        ok: false,

                        mensaje:
                            "No se pudo consultar el estado."

                    });
            }

            if (
                !data
            ) {

                return res
                    .status(404)
                    .json({

                        ok: false,

                        mensaje:
                            "Acreditación no encontrada."

                    });
            }

            return res.json({

                ok: true,

                acreditacion: {

                    numeroAcreditacion:
                        data.numero_acreditacion,

                    estado:
                        data.estado,

                    marca:
                        data.marca,

                    modelo:
                        data.modelo,

                    anio:
                        data.anio,

                    patente:
                        data.patente,

                    acompanantes:
                        data.acompanantes,

                    total:
                        data.total

                }

            });

        } catch (error) {

            console.error(
                "ERROR ESTADO:",
                error
            );

            return res
                .status(500)
                .json({

                    ok: false,

                    mensaje:
                        "Error interno del servidor."

                });
        }
    }
);

// =====================================================
// API — ESTADO DEL SERVIDOR
// =====================================================

app.get(
    "/api/estado",
    function (req, res) {

        res.json({

            ok: true,

            servidor:
                "WOLF SHOWCARS",

            evento:
                "WOLF SHOWCARS 2027",

            estado:
                "FUNCIONANDO",

            puerto:
                PORT,

            urlPublica:
                URL_PUBLICA,

            supabase:
                "CONFIGURADO",

            mercadoPago:
                process.env.MP_ACCESS_TOKEN
                    ? "CONFIGURADO"
                    : "NO CONFIGURADO",

            webhook:
                process.env.MP_WEBHOOK_SECRET
                    ? "PROTEGIDO"
                    : "NO CONFIGURADO",

            webhookUrl:
                URL_PUBLICA +
                "/api/mercadopago/webhook",

            fecha:
                new Date().toISOString()

        });
    }
);

// =====================================================
// ARCHIVOS ESTÁTICOS
// =====================================================

app.use(
    express.static(
        path.join(
            __dirname,
            ".."
        )
    )
);

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

app.get(
    "/",
    function (req, res) {

        res.sendFile(
            path.join(
                __dirname,
                "..",
                "index.html"
            )
        );
    }
);

// =====================================================
// API 404
// =====================================================

app.use(
    "/api",
    function (req, res) {

        console.error(
            "API 404:",
            req.method,
            req.originalUrl
        );

        res
            .status(404)
            .json({

                ok: false,

                mensaje:
                    "Ruta API no encontrada.",

                metodo:
                    req.method,

                ruta:
                    req.originalUrl

            });
    }
);

// =====================================================
// MANEJO GLOBAL DE ERRORES
// =====================================================

app.use(
    function (
        error,
        req,
        res,
        next
    ) {

        console.error(
            "ERROR NO CONTROLADO:",
            error
        );

        if (
            res.headersSent
        ) {

            return next(error);
        }

        res
            .status(500)
            .json({

                ok: false,

                mensaje:
                    "Error interno del servidor."

            });
    }
);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(
    PORT,
    function () {

        console.log(
            "=========================================="
        );

        console.log(
            " WOLF SHOWCARS 2027"
        );

        console.log(
            " SERVIDOR BACKEND"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "Puerto:",
            PORT
        );

        console.log(
            "Local:",
            `http://localhost:${PORT}`
        );

        console.log(
            "URL pública:",
            URL_PUBLICA
        );

        console.log(
            "Supabase: CONFIGURADO"
        );

        console.log(
            "Mercado Pago: CONFIGURADO"
        );

        console.log(
            "Webhook:",
            process.env.MP_WEBHOOK_SECRET
                ? "PROTEGIDO"
                : "NO CONFIGURADO"
        );

        console.log(
            "URL Webhook:"
        );

        console.log(
            URL_PUBLICA +
            "/api/mercadopago/webhook"
        );

        console.log(
            "=========================================="
        );
    }
);